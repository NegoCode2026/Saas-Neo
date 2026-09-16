import { Router } from "express";
import { prisma } from "../../config/prisma-client.js";
import { authMiddleware, requireDueno, type AuthRequest } from "../../shared/middleware/require-auth.js";
import { updateSchema } from "./business-settings.schemas.js";

/* Business settings API (URL /negocio): current business profile + owner-only updates. File renamed from negocio.ts for clarity. */
export const negocioRouter = Router();
negocioRouter.use(authMiddleware);

// GET /negocio — datos del negocio del usuario (incluye el WhatsApp de recordatorios).
negocioRouter.get("/", async (req: AuthRequest, res) => {
  const negocio = await prisma.negocio.findUnique({
    where: { id: req.negocioId! },
    select: { id: true, nombre: true, nit: true, whatsapp: true, createdAt: true },
  });
  if (!negocio) return res.status(404).json({ error: "No encontrado" });
  res.json(negocio);
});

// PATCH /negocio — solo el dueño. El WhatsApp se guarda solo con dígitos.
negocioRouter.patch("/", requireDueno, async (req: AuthRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const data = { ...parsed.data };
  if (data.whatsapp !== undefined && data.whatsapp !== null) {
    const limpio = data.whatsapp.replace(/\D/g, "");
    data.whatsapp = limpio.length ? limpio : null;
  }

  const negocio = await prisma.negocio.update({
    where: { id: req.negocioId! },
    data,
    select: { id: true, nombre: true, nit: true, whatsapp: true },
  });
  res.json(negocio);
});
