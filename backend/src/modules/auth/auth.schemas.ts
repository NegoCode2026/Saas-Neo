import { z } from "zod";

export const registerSchema = z.object({
  negocio: z.string().min(2).max(80),
  nombre: z.string().min(2).max(80),
  email: z.string().email().max(120),
  password: z.string().min(8).max(72),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotSchema = z.object({ email: z.string().email().max(120) });

export const resetSchema = z.object({ token: z.string().min(16).max(200), password: z.string().min(8).max(72) });
