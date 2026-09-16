import { z } from "zod";

export const conteoSchema = z.object({
  items: z
    .array(
      z.object({
        productoId: z.string().min(1),
        contado: z.number().int().min(0).max(100000),
      })
    )
    .min(1, "Nada para contar")
    .max(500, "Máximo 500 productos por conteo"),
  motivo: z.string().max(60).optional(),
});
