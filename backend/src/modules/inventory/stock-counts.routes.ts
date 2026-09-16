import { Router } from "express";
import { prisma } from "../../config/prisma-client.js";
import { authMiddleware, type AuthRequest } from "../../shared/middleware/require-auth.js";
import { conteoSchema } from "./stock-counts.schemas.js";

/* Physical stock-count API (URL /conteos): apply counted quantities as AJUSTE movements. Renamed from conteos.ts. */
export const conteosRouter = Router();
conteosRouter.use(authMiddleware);

/* Conteo físico: el usuario cuenta lo que hay en el estante y confirma.
   Solo se generan movimientos AJUSTE por la diferencia (contado - sistema),
   firmados por quien contó. Todo en una transacción: si algo falla, no se
   aplica nada. El valor de la diferencia se calcula a precio de compra. */

// POST /conteos — aplica el conteo y devuelve el resumen de diferencias
conteosRouter.post("/", async (req: AuthRequest, res) => {
  const parsed = conteoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const negocioId = req.negocioId!;
  const { items, motivo } = parsed.data;

  const ids = items.map((it) => it.productoId);
  if (new Set(ids).size !== ids.length) {
    return res.status(400).json({ error: "Hay productos repetidos en el conteo" });
  }

  try {
    const resumen = await prisma.$transaction(async (tx) => {
      const prods = await tx.producto.findMany({
        where: { id: { in: ids }, negocioId, activo: true },
        select: { id: true, nombre: true, stockActual: true, precioCompra: true },
      });
      if (prods.length !== ids.length) throw new Error("Algún producto no existe o está desactivado");
      const porId = new Map(prods.map((p) => [p.id, p]));

      const detalle: {
        productoId: string;
        nombre: string;
        antes: number;
        contado: number;
        diferencia: number;
      }[] = [];
      let faltantesUnidades = 0;
      let faltantesValor = 0;
      let sobrantesUnidades = 0;
      let sobrantesValor = 0;
      let sinCambios = 0;

      for (const it of items) {
        const prod = porId.get(it.productoId)!;
        const diferencia = it.contado - prod.stockActual;
        if (diferencia === 0) {
          sinCambios++;
          continue;
        }
        await tx.producto.update({ where: { id: prod.id }, data: { stockActual: it.contado } });
        const texto = `Conteo físico: había ${prod.stockActual}, contó ${it.contado}${motivo ? ` — ${motivo}` : ""}`;
        await tx.movimiento.create({
          data: {
            negocioId,
            productoId: prod.id,
            tipo: "AJUSTE",
            cantidad: Math.abs(diferencia),
            motivo: texto.slice(0, 140),
            creadoPorId: req.userId!,
          },
        });
        if (diferencia < 0) {
          faltantesUnidades += -diferencia;
          faltantesValor += -diferencia * prod.precioCompra;
        } else {
          sobrantesUnidades += diferencia;
          sobrantesValor += diferencia * prod.precioCompra;
        }
        detalle.push({ productoId: prod.id, nombre: prod.nombre, antes: prod.stockActual, contado: it.contado, diferencia });
      }

      detalle.sort((a, b) => Math.abs(b.diferencia) - Math.abs(a.diferencia));
      return {
        ajustados: detalle.length,
        sinCambios,
        faltantesUnidades,
        faltantesValor,
        sobrantesUnidades,
        sobrantesValor,
        items: detalle,
      };
    });
    res.status(201).json(resumen);
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : "No se pudo aplicar el conteo" });
  }
});
