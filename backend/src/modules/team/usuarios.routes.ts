import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../../config/prisma-client.js";
import { authMiddleware, requireDueno, type AuthRequest } from "../../shared/middleware/require-auth.js";
import { createEmpleadoSchema } from "./usuarios.schemas.js";

export const usuariosRouter = Router();
usuariosRouter.use(authMiddleware);

// GET /usuarios — lista equipo de TU negocio (dueño y empleados ven la lista, solo dueño gestiona)
usuariosRouter.get("/", async (req: AuthRequest, res) => {
  const users = await prisma.usuario.findMany({
    where: { negocioId: req.negocioId! },
    select: { id: true, nombre: true, email: true, rol: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json(users);
});

// POST /usuarios/empleados — SOLO DUEÑO. Crea empleado dentro de su negocio.
usuariosRouter.post("/empleados", requireDueno, async (req: AuthRequest, res) => {
  const parsed = createEmpleadoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const count = await prisma.usuario.count({ where: { negocioId: req.negocioId! } });
  if (count >= 4) return res.status(400).json({ error: "Límite MVP: 4 usuarios por negocio (dueño + 3)" });

  const existing = await prisma.usuario.findFirst({ where: { email: parsed.data.email } });
  if (existing) return res.status(409).json({ error: "Email ya registrado" });

  const hash = await bcrypt.hash(parsed.data.password, 12);
  const u = await prisma.usuario.create({
    data: { negocioId: req.negocioId!, nombre: parsed.data.nombre, email: parsed.data.email, password: hash, rol: "EMPLEADO" },
    select: { id: true, nombre: true, email: true, rol: true },
  });
  res.status(201).json(u);
});

// DELETE /usuarios/:id — SOLO DUEÑO, no puede borrarse a sí mismo ni a otro dueño
usuariosRouter.delete("/:id", requireDueno, async (req: AuthRequest, res) => {
  if (req.params.id === req.userId) return res.status(400).json({ error: "No podés borrarte a vos mismo" });
  const target = await prisma.usuario.findFirst({
    where: { id: req.params.id, negocioId: req.negocioId! },
  });
  if (!target) return res.status(404).json({ error: "No encontrado" });
  if (target.rol === "DUENO") return res.status(403).json({ error: "No se puede borrar al dueño" });
  await prisma.usuario.delete({ where: { id: target.id } });
  res.status(204).end();
});
