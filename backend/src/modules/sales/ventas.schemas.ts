import { z } from "zod";

export const ventaSchema = z.object({
  items: z
    .array(z.object({ productoId: z.string(), cantidad: z.number().int().min(1) }))
    .min(1)
    .max(50),
  // Clave de idempotencia (la manda el POS al reintentar una venta offline).
  idempotencyKey: z.string().min(8).max(120).optional(),
  // Promoción: descuento absoluto en centavos. Con tope por rol.
  descuento: z.number().int().min(0).default(0),
  // Cómo pagó el cliente. El arqueo de caja solo cuadra el efectivo.
  metodoPago: z.enum(["EFECTIVO", "NEQUI", "TARJETA", "TRANSFERENCIA"]).default("EFECTIVO"),
});
