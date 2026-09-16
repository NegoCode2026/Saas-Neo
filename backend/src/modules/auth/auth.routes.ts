import { Router } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { prisma } from "../../config/prisma-client.js";
import { signToken } from "../../shared/auth/jwt-tokens.js";
import { setSessionCookie, clearSessionCookie } from "../../shared/auth/session-cookies.js";
import { enviarEmailReset } from "../../shared/email/password-reset-email.js";
import { authMiddleware, type AuthRequest } from "../../shared/middleware/require-auth.js";
import { forgotSchema, loginSchema, registerSchema, resetSchema } from "./auth.schemas.js";

export const authRouter = Router();

/* Fuerza bruta: 20 intentos cada 15 min por IP en login/register. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: { error: "Demasiados intentos. Esperá unos minutos e intentá de nuevo." },
});

/* Recuperación: más restrictivo (10 por 15 min) para evitar spam de emails. */
const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: { error: "Demasiados pedidos. Esperá unos minutos." },
});

// POST /auth/register — crea Negocio + Usuario DUENO. Es la única ruta que crea tenants.
authRouter.post("/register", authLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { negocio, nombre, email, password } = parsed.data;

  const existing = await prisma.usuario.findFirst({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email ya registrado" });

  const hash = await bcrypt.hash(password, 12);
  const result = await prisma.$transaction(async (tx) => {
    const neg = await tx.negocio.create({ data: { nombre: negocio } });
    const user = await tx.usuario.create({
      data: { negocioId: neg.id, nombre, email, password: hash, rol: "DUENO" },
    });
    return { neg, user };
  });

  const token = signToken({ sub: result.user.id, negocioId: result.neg.id, rol: "DUENO" });
  setSessionCookie(res, token);
  // El token también va en el body para clientes API/tests; el navegador usa la cookie.
  res.status(201).json({
    token,
    negocio: { id: result.neg.id, nombre: result.neg.nombre },
    user: { id: result.user.id, nombre, email, rol: "DUENO" },
  });
});

// POST /auth/login — valida por email global, sesión en cookie httpOnly
authRouter.post("/login", authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.usuario.findFirst({
    where: { email: parsed.data.email },
    include: { negocio: true },
  });
  if (!user) return res.status(401).json({ error: "Credenciales inválidas" });
  const ok = await bcrypt.compare(parsed.data.password, user.password);
  if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

  const token = signToken({ sub: user.id, negocioId: user.negocioId, rol: user.rol });
  setSessionCookie(res, token);
  res.json({
    token,
    negocio: { id: user.negocio.id, nombre: user.negocio.nombre },
    user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
  });
});

// POST /auth/logout — borra la cookie de sesión
authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

authRouter.get("/me", authMiddleware, async (req: AuthRequest, res) => {
  const user = await prisma.usuario.findFirst({
    where: { id: req.userId!, negocioId: req.negocioId! },
    select: { id: true, nombre: true, email: true, rol: true, negocio: { select: { id: true, nombre: true } } },
  });
  if (!user) return res.status(404).json({ error: "No encontrado" });
  res.json(user);
});

// POST /auth/forgot — siempre 200 para no revelar si el email existe.
authRouter.post("/forgot", forgotLimiter, async (req, res) => {
  const parsed = forgotSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.usuario.findFirst({ where: { email: parsed.data.email } });
  if (user) {
    const raw = crypto.randomBytes(32).toString("hex");
    const hash = crypto.createHash("sha256").update(raw).digest("hex");
    await prisma.usuario.update({
      where: { id: user.id },
      data: { resetTokenHash: hash, resetTokenExpira: new Date(Date.now() + 60 * 60 * 1000) },
    });
    const link = `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/reset?token=${raw}`;
    enviarEmailReset(user.email, link).catch(() => {});
    // En desarrollo devolvemos el link para poder probar sin proveedor de email.
    if (process.env.NODE_ENV !== "production") return res.json({ ok: true, devLink: link });
  }
  res.json({ ok: true });
});

// POST /auth/reset — valida el token (hash + vigencia) y cambia la contraseña.
authRouter.post("/reset", forgotLimiter, async (req, res) => {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const hash = crypto.createHash("sha256").update(parsed.data.token).digest("hex");
  const user = await prisma.usuario.findFirst({
    where: { resetTokenHash: hash, resetTokenExpira: { gt: new Date() } },
  });
  if (!user) return res.status(400).json({ error: "El link no es válido o venció. Pedí uno nuevo." });

  const password = await bcrypt.hash(parsed.data.password, 12);
  await prisma.usuario.update({
    where: { id: user.id },
    data: { password, resetTokenHash: null, resetTokenExpira: null },
  });
  res.json({ ok: true });
});
