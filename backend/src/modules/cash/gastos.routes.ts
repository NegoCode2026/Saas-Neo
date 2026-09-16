import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma-client.js";
import { authMiddleware, type AuthRequest } from "../../shared/middleware/require-auth.js";
import { gastoSchema } from "./gastos.schemas.js";

export const gastosRouter = Router();
gastosRouter.use(authMiddleware);

// GET /gastos — últimos primero
gastosRouter.get("/", async (req: AuthRequest, res) => {
  const gastos = await prisma.gasto.findMany({
    where: { negocioId: req.negocioId! },
    orderBy: { fecha: "desc" },
    take: 100,
    include: { creadoPor: { select: { nombre: true } } },
  });
  res.json(gastos);
});

// POST /gastos — registra un egreso (luz, arriendo, transporte...)
// Idempotencia: con idempotenciaKey repetida se devuelve el gasto original.
gastosRouter.post("/", async (req: AuthRequest, res) => {
  const parsed = gastoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const negocioId = req.negocioId!;
  const { concepto, categoria, monto, fecha, idempotenciaKey } = parsed.data;

  if (idempotenciaKey) {
    const previo = await prisma.gasto.findFirst({
      where: { negocioId, idempotenciaKey },
      include: { creadoPor: { select: { nombre: true } } },
    });
    if (previo) return res.status(200).json(previo);
  }

  try {
    const g = await prisma.gasto.create({
      data: {
        negocioId,
        concepto,
        categoria,
        monto,
        ...(fecha ? { fecha: new Date(fecha) } : {}),
        idempotenciaKey,
        creadoPorId: req.userId!,
      },
      include: { creadoPor: { select: { nombre: true } } },
    });
    res.status(201).json(g);
  } catch (e: any) {
    // Carrera entre dos reintentos con la misma clave: devolvemos el que ganó.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && idempotenciaKey) {
      const previo = await prisma.gasto.findFirst({
        where: { negocioId, idempotenciaKey },
        include: { creadoPor: { select: { nombre: true } } },
      });
      if (previo) return res.status(200).json(previo);
    }
    res.status(400).json({ error: e.message ?? "No se pudo registrar el gasto" });
  }
});

// DELETE /gastos/:id — el dueño borra cualquiera; el empleado solo los suyos
gastosRouter.delete("/:id", async (req: AuthRequest, res) => {
  const existing = await prisma.gasto.findFirst({
    where: { id: req.params.id, negocioId: req.negocioId! },
  });
  if (!existing) return res.status(404).json({ error: "No encontrado" });
  if (req.rol !== "DUENO" && existing.creadoPorId !== req.userId) {
    return res.status(403).json({ error: "Solo podés borrar tus propios gastos" });
  }
  await prisma.gasto.delete({ where: { id: existing.id } });
  res.status(204).end();
});
