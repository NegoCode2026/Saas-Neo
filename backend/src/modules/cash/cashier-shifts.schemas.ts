import { z } from "zod";

export const abrirSchema = z.object({
  fondoInicial: z.number().int().min(0).max(100000000000).default(0), // centavos
});
