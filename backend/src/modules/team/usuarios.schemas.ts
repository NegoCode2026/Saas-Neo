import { z } from "zod";

export const createEmpleadoSchema = z.object({
  nombre: z.string().min(2).max(80),
  email: z.string().email().max(120),
  password: z.string().min(8).max(72),
});
