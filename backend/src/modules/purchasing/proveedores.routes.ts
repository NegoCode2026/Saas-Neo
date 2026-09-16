import { Router } from "express";
import { prisma } from "../../config/prisma-client.js";
import { authMiddleware, type AuthRequest } from "../../shared/middleware/require-auth.js";
import { createSchema } from "./proveedores.schemas.js";

export const proveedoresRouter = Router();
proveedoresRouter.use(authMiddleware);

proveedoresRouter.get("/", async (req: AuthRequest, res) => {
  const provs = await prisma.proveedor.findMany({
    where: { negocioId: req.negocioId! },
    orderBy: { nombre: "asc" },
    take: 100,
  });
  res.json(provs);
});

proveedoresRouter.post("/", async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const p = await prisma.proveedor.create({
    data: { ...parsed.data, negocioId: req.negocioId! },
  });
  res.status(201).json(p);
});

proveedoresRouter.delete("/:id", async (req: AuthRequest, res) => {
  const existing = await prisma.proveedor.findFirst({
    where: { id: req.params.id, negocioId: req.negocioId! },
  });
  if (!existing) return res.status(404).json({ error: "No encontrado" });
  await prisma.proveedor.delete({ where: { id: existing.id } });
  res.status(204).end();
});
