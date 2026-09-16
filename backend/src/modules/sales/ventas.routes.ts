import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma-client.js";
import { authMiddleware, type AuthRequest } from "../../shared/middleware/require-auth.js";
import { ventaSchema } from "./ventas.schemas.js";

export const ventasRouter = Router();
ventasRouter.use(authMiddleware);

/* Un empleado no puede regalar la tienda: tope del 10% del subtotal.
   El dueño no tiene tope (hasta el 100%). */
const DESCUENTO_MAX_EMPLEADO_PCT = 10;

// POST /ventas — POS: descuenta stock ATÓMICAMENTE por ítem.
// El descuento es un UPDATE condicional (solo si hay stock suficiente):
// en Postgres el UPDATE revalida la condición sobre la versión más nueva
// de la fila, así que dos cajas concurrentes no pueden sobrevender.
// Si algo falla, rollback total.
//
// Idempotencia: si llega idempotencyKey y ya existe una venta con esa clave
// para el negocio, se devuelve la existente sin volver a descontar stock.
ventasRouter.post("/", async (req: AuthRequest, res) => {
  const parsed = ventaSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const negocioId = req.negocioId!;
  const { items, idempotencyKey, metodoPago } = parsed.data;

  if (idempotencyKey) {
    const previa = await prisma.venta.findFirst({
      where: { negocioId, idempotencyKey },
      include: { items: true },
    });
    if (previa) return res.status(200).json(previa);
  }

  try {
    const venta = await prisma.$transaction(async (tx) => {
      // 1) Descontar cada ítem solo si hay stock (atómico por fila)
      const precios = new Map<string, { precioVenta: number; nombre: string }>();
      for (const item of items) {
        const r = await tx.producto.updateMany({
          where: { id: item.productoId, negocioId, activo: true, stockActual: { gte: item.cantidad } },
          data: { stockActual: { decrement: item.cantidad } },
        });
        if (r.count === 0) {
          const prod = await tx.producto.findFirst({
            where: { id: item.productoId, negocioId },
            select: { nombre: true, stockActual: true },
          });
          if (!prod) throw new Error(`Producto no encontrado: ${item.productoId}`);
          throw new Error(`Sin stock: ${prod.nombre} (quedan ${prod.stockActual})`);
        }
        const prod = await tx.producto.findFirstOrThrow({
          where: { id: item.productoId, negocioId },
          select: { precioVenta: true, nombre: true },
        });
        precios.set(item.productoId, prod);
      }
      // 2) Crear la venta con snapshot de precios
      const itemsData = items.map((item) => ({
        productoId: item.productoId,
        cantidad: item.cantidad,
        precioUnit: precios.get(item.productoId)!.precioVenta,
      }));
      const total = itemsData.reduce((acc, it) => acc + it.precioUnit * it.cantidad, 0);
      const descuento = parsed.data.descuento ?? 0;
      if (descuento > total) throw new Error("El descuento no puede superar el subtotal");
      if (req.rol === "EMPLEADO") {
        const max = Math.floor((total * DESCUENTO_MAX_EMPLEADO_PCT) / 100);
        if (descuento > max) {
          throw new Error(`Como empleado, el descuento máximo es el ${DESCUENTO_MAX_EMPLEADO_PCT}% del subtotal`);
        }
      }
      const created = await tx.venta.create({
        data: { negocioId, total: total - descuento, descuento, metodoPago, idempotencyKey, creadoPorId: req.userId!, items: { create: itemsData } },
        include: { items: true },
      });
      // 3) Registrar movimientos SALIDA (el stock ya se descontó en 1)
      for (const item of items) {
        await tx.movimiento.create({
          data: { negocioId, productoId: item.productoId, tipo: "SALIDA", cantidad: item.cantidad, motivo: `Venta ${created.id}`, creadoPorId: req.userId! },
        });
      }
      return created;
    });
    res.status(201).json(venta);
  } catch (e: any) {
    // Carrera entre dos reintentos con la misma clave: devolvemos la que ganó.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && idempotencyKey) {
      const previa = await prisma.venta.findFirst({
        where: { negocioId, idempotencyKey },
        include: { items: true },
      });
      if (previa) return res.status(200).json(previa);
    }
    res.status(400).json({ error: e.message ?? "No se pudo registrar la venta" });
  }
});

ventasRouter.get("/", async (req: AuthRequest, res) => {
  const ventas = await prisma.venta.findMany({
    where: { negocioId: req.negocioId! },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { items: true, creadoPor: { select: { id: true, nombre: true } } },
  });
  res.json(ventas);
});
