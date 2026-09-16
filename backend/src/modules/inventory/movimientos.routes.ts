import { Router } from "express";
import { prisma } from "../../config/prisma-client.js";
import { authMiddleware, type AuthRequest } from "../../shared/middleware/require-auth.js";
import { createSchema } from "./movimientos.schemas.js";

export const movimientosRouter = Router();
movimientosRouter.use(authMiddleware);

// GET /movimientos?productoId=xxx — historial, siempre de tu negocio
movimientosRouter.get("/", async (req: AuthRequest, res) => {
  const productoId = req.query.productoId ? String(req.query.productoId) : undefined;
  const movs = await prisma.movimiento.findMany({
    where: { negocioId: req.negocioId!, ...(productoId ? { productoId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      producto: { select: { id: true, nombre: true } },
      creadoPor: { select: { id: true, nombre: true } },
    },
  });
  res.json(movs);
});

// POST /movimientos — ENTRADA suma, SALIDA resta (atómica), AJUSTE setea el stock al conteo físico.
// Todo en transacción: si falla, no se mueve nada. Concepto: stock nunca se edita a mano, solo por movimientos.
movimientosRouter.post("/", async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const negocioId = req.negocioId!;
  const { productoId, tipo, cantidad, motivo } = parsed.data;
  if (tipo !== "AJUSTE" && cantidad < 1) {
    return res.status(400).json({ error: "La cantidad debe ser al menos 1" });
  }

  try {
    const mov = await prisma.$transaction(async (tx) => {
      const prod = await tx.producto.findFirst({ where: { id: productoId, negocioId } });
      if (!prod) throw new Error("Producto no encontrado");
      const base = {
        include: {
          producto: { select: { id: true, nombre: true, stockActual: true } },
          creadoPor: { select: { id: true, nombre: true } },
        },
      } as const;

      if (tipo === "ENTRADA") {
        await tx.producto.update({ where: { id: prod.id }, data: { stockActual: { increment: cantidad } } });
        return tx.movimiento.create({
          data: { negocioId, productoId: prod.id, tipo, cantidad, motivo, creadoPorId: req.userId! },
          ...base,
        });
      }

      if (tipo === "SALIDA") {
        // UPDATE condicional: solo descuenta si hay stock (atómico ante concurrencia)
        const r = await tx.producto.updateMany({
          where: { id: prod.id, stockActual: { gte: cantidad } },
          data: { stockActual: { decrement: cantidad } },
        });
        if (r.count === 0) {
          const fresh = await tx.producto.findFirstOrThrow({
            where: { id: prod.id },
            select: { stockActual: true },
          });
          throw new Error(`Sin stock: tiene ${fresh.stockActual}, pide ${cantidad}`);
        }
        return tx.movimiento.create({
          data: { negocioId, productoId: prod.id, tipo, cantidad, motivo, creadoPorId: req.userId! },
          ...base,
        });
      }

      // AJUSTE: cantidad = lo contado físicamente. Setea el stock y deja traza con la diferencia.
      const diferencia = cantidad - prod.stockActual;
      if (diferencia === 0) throw new Error("Sin cambios: el conteo coincide con el stock actual");
      await tx.producto.update({ where: { id: prod.id }, data: { stockActual: cantidad } });
      const detalle = `Conteo: había ${prod.stockActual}, contó ${cantidad}${motivo ? ` — ${motivo}` : ""}`;
      return tx.movimiento.create({
        data: { negocioId, productoId: prod.id, tipo, cantidad: Math.abs(diferencia), motivo: detalle.slice(0, 140), creadoPorId: req.userId! },
        ...base,
      });
    });
    res.status(201).json(mov);
  } catch (e: any) {
    res.status(400).json({ error: e.message ?? "No se pudo registrar el movimiento" });
  }
});
