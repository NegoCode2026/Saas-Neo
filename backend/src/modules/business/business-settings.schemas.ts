import { z } from "zod";

export const updateSchema = z.object({
  nombre: z.string().min(2).max(80).optional(),
  nit: z.string().max(30).nullable().optional(),
  whatsapp: z.string().max(30).nullable().optional(),
});
