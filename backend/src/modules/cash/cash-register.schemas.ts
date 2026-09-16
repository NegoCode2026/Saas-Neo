import { z } from "zod";

export const cerrarSchema = z.object({
  contado: z.number().int().min(0).max(100000000000),
  notas: z.string().max(200).optional(),
});
