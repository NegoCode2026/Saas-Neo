import { z } from "zod";

export const createSchema = z.object({
  productoId: z.string().min(1),
  tipo: z.enum(["ENTRADA", "SALIDA", "AJUSTE"]),
  // ENTRADA/SALIDA: unidades a mover (≥1). AJUSTE: stock contado físicamente (puede ser 0).
  cantidad: z.number().int().min(0).max(100000),
  motivo: z.string().max(140).optional(),
});
