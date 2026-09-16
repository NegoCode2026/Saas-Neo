import { z } from "zod";

export const gastoSchema = z.object({
  concepto: z.string().min(1).max(120),
  categoria: z.string().max(60).optional(),
  monto: z.number().int().min(1).max(100000000000), // centavos
  fecha: z.string().datetime({ offset: true }).optional(),
  // Clave de idempotencia (la manda el frontend al reintentar un gasto offline).
  idempotenciaKey: z.string().min(8).max(120).optional(),
});
