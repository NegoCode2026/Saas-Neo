import { z } from "zod";

export const createSchema = z.object({
  proveedorId: z.string().min(1),
  items: z.array(z.object({ productoId: z.string().min(1), cantidad: z.number().int().min(1).max(10000) })).min(1).max(100).optional(),
  // auto: true genera los ítems desde el bajo stock (cantidad sugerida = reponer hasta 2x el mínimo)
  auto: z.boolean().optional(),
});
