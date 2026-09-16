import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma-client.js";
import { authMiddleware, type AuthRequest } from "../../shared/middleware/require-auth.js";
import { createSchema } from "./pedidos.schemas.js";

export const pedidosRouter = Router();
pedidosRouter.use(authMiddleware);

const detalle = {
  include: {
    proveedor: { select: { id: true, nombre: true, telefono: true } },
    items: { include: { producto: { select: { id: true, nombre: true } } } },
    creadoPor: { select: { id: true, nombre: true } },
  },
} as const;

// GET /pedidos — historial con proveedor e ítems
pedidosRouter.get("/", async (req: AuthRequest, res) => {
  const pedidos = await prisma.pedido.findMany({
    where: { negocioId: req.negocioId! },
    orderBy: { createdAt: "desc" },
    take: 50,
    ...detalle,
  });
  res.json(pedidos);
});

// POST /pedidos — crea un borrador manual o automático desde el bajo stock
pedidosRouter.post("/", async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const negocioId = req.negocioId!;
  const { proveedorId, auto } = parsed.data;

  const proveedor = await prisma.proveedor.findFirst({ where: { id: proveedorId, negocioId } });
  if (!proveedor) return res.status(404).json({ error: "Proveedor no encontrado" });

  let items = parsed.data.items ?? [];
  if (auto || items.length === 0) {
    const bajos = await prisma.producto.findMany({
      where: { negocioId, activo: true },
      select: { id: true, stockActual: true, stockMinimo: true },
    });
    const sugeridos = bajos
      .filter((p) => p.stockActual <= p.stockMinimo)
      .map((p) => ({ productoId: p.id, cantidad: Math.max(1, p.stockMinimo * 2 - p.stockActual) }))
      .slice(0, 100);
    if (sugeridos.length === 0) {
      return res.status(400).json({ error: "No hay productos en bajo stock para pedir" });
    }
    items = sugeridos;
  }

  // Validar que los productos sean del negocio y sigan activos
  const ids = [...new Set(items.map((i) => i.productoId))];
  const validos = await prisma.producto.findMany({
    where: { id: { in: ids }, negocioId, activo: true },
    select: { id: true },
  });
  if (validos.length !== ids.length) {
    return res.status(400).json({ error: "Algún producto no existe o está desactivado" });
  }

  const pedido = await prisma.pedido.create({
    data: {
      negocioId,
      proveedorId: proveedor.id,
      creadoPorId: req.userId!,
      items: { create: items },
    },
    ...detalle,
  });
  res.status(201).json(pedido);
});

// POST /pedidos/:id/enviar — BORRADOR → ENVIADO (el front abre WhatsApp con el detalle)
pedidosRouter.post("/:id/enviar", async (req: AuthRequest, res) => {
  const pedido = await prisma.pedido.findFirst({
    where: { id: req.params.id, negocioId: req.negocioId! },
  });
  if (!pedido) return res.status(404).json({ error: "No encontrado" });
  if (pedido.estado !== "BORRADOR") {
    return res.status(400).json({ error: `Solo un borrador se puede enviar (está ${pedido.estado})` });
  }
  const actualizado = await prisma.pedido.update({
    where: { id: pedido.id },
    data: { estado: "ENVIADO" },
    ...detalle,
  });
  res.json(actualizado);
});

// POST /pedidos/:id/recibir — ENVIADO → RECIBIDO + ENTRADAS a stock en transacción
pedidosRouter.post("/:id/recibir", async (req: AuthRequest, res) => {
  const negocioId = req.negocioId!;
  try {
    const pedido = await prisma.$transaction(async (tx) => {
      const p = await tx.pedido.findFirst({
        where: { id: req.params.id, negocioId },
        include: { items: true },
      });
      if (!p) throw Object.assign(new Error("No encontrado"), { status: 404 });
      if (p.estado !== "ENVIADO") {
        throw Object.assign(new Error(`Solo un pedido enviado se puede recibir (está ${p.estado})`), { status: 400 });
      }
      for (const it of p.items) {
        const prod = await tx.producto.findFirst({ where: { id: it.productoId, negocioId, activo: true } });
        if (!prod) throw Object.assign(new Error("Un producto del pedido ya no está activo"), { status: 400 });
        await tx.producto.update({ where: { id: prod.id }, data: { stockActual: { increment: it.cantidad } } });
        await tx.movimiento.create({
          data: {
            negocioId,
            productoId: prod.id,
            tipo: "ENTRADA",
            cantidad: it.cantidad,
            motivo: `Pedido ${p.id} recibido`,
            creadoPorId: req.userId!,
          },
        });
      }
      return tx.pedido.update({
        where: { id: p.id },
        data: { estado: "RECIBIDO", recibidoAt: new Date() },
        ...detalle,
      });
    });
    res.json(pedido);
  } catch (e: any) {
    res.status(e.status ?? 400).json({ error: e.message ?? "No se pudo recibir el pedido" });
  }
});

// POST /pedidos/:id/cancelar — BORRADOR|ENVIADO → CANCELADO
pedidosRouter.post("/:id/cancelar", async (req: AuthRequest, res) => {
  const pedido = await prisma.pedido.findFirst({
    where: { id: req.params.id, negocioId: req.negocioId! },
  });
  if (!pedido) return res.status(404).json({ error: "No encontrado" });
  if (pedido.estado !== "BORRADOR" && pedido.estado !== "ENVIADO") {
    return res.status(400).json({ error: `No se puede cancelar un pedido ${pedido.estado}` });
  }
  const actualizado = await prisma.pedido.update({
    where: { id: pedido.id },
    data: { estado: "CANCELADO" },
    ...detalle,
  });
  res.json(actualizado);
});

const comprobanteSchema = z.object({
  // Foto comprimida en cliente (dataURL JPEG/PNG/WebP, tope ~1.5MB).
  foto: z
    .string()
    .min(100)
    .max(2000000)
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, "Foto inválida (JPEG/PNG/WebP en base64)"),
});

// POST /pedidos/:id/comprobante — adjunta la foto de la factura/remisión.
// Solo en ENVIADO o RECIBIDO: es evidencia de lo que llegó.
pedidosRouter.post("/:id/comprobante", async (req: AuthRequest, res) => {
  const parsed = comprobanteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const pedido = await prisma.pedido.findFirst({
    where: { id: req.params.id, negocioId: req.negocioId! },
  });
  if (!pedido) return res.status(404).json({ error: "No encontrado" });
  if (pedido.estado !== "ENVIADO" && pedido.estado !== "RECIBIDO") {
    return res.status(400).json({ error: `Solo un pedido enviado o recibido lleva comprobante (está ${pedido.estado})` });
  }
  const actualizado = await prisma.pedido.update({
    where: { id: pedido.id },
    data: { comprobanteUrl: parsed.data.foto },
    ...detalle,
  });
  res.json(actualizado);
});
