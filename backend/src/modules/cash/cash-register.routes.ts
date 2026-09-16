import { Router } from "express";
import { prisma } from "../../config/prisma-client.js";
import { authMiddleware, type AuthRequest } from "../../shared/middleware/require-auth.js";
import { resumenCaja, turnoAbierto } from "./cashier-shifts.routes.js";
import { cerrarSchema } from "./cash-register.schemas.js";

/* Cash register count API (URL /caja): expected cash + closings. Renamed from caja.ts. */
export const cajaRouter = Router();
cajaRouter.use(authMiddleware);

/* Arqueo de caja: el esperado sale de ventas en EFECTIVO más el fondo
   inicial del turno. Con turno abierto el período es el turno; sin turno,
   desde el último cierre (compatibilidad hacia atrás). */

// GET /caja/actual — cuánto debería haber ahora mismo
cajaRouter.get("/actual", async (req: AuthRequest, res) => {
  const negocioId = req.negocioId!;
  const [turno, ultimo] = await Promise.all([
    turnoAbierto(negocioId),
    prisma.cierreCaja.findFirst({
      where: { negocioId },
      orderBy: { createdAt: "desc" },
      include: { creadoPor: { select: { nombre: true } } },
    }),
  ]);
  const desde = turno?.abiertoAt ?? ultimo?.createdAt ?? new Date(0);
  const resumen = await resumenCaja(negocioId, desde, turno?.fondoInicial ?? 0);
  res.json({ desde, ...resumen, ultimoCierre: ultimo, turno });
});

// POST /caja/cerrar — guarda el arqueo con su diferencia. Si hay turno
// abierto lo enlaza y lo marca CERRADO. Todo en transacción.
cajaRouter.post("/cerrar", async (req: AuthRequest, res) => {
  const parsed = cerrarSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const negocioId = req.negocioId!;

  const turno = await turnoAbierto(negocioId);
  const ultimo = turno
    ? null
    : await prisma.cierreCaja.findFirst({
        where: { negocioId },
        orderBy: { createdAt: "desc" },
      });
  const desde = turno?.abiertoAt ?? ultimo?.createdAt ?? new Date(0);
  const resumen = await resumenCaja(negocioId, desde, turno?.fondoInicial ?? 0);

  const cierre = await prisma.$transaction(async (tx) => {
    const c = await tx.cierreCaja.create({
      data: {
        negocioId,
        esperado: resumen.esperado,
        contado: parsed.data.contado,
        diferencia: parsed.data.contado - resumen.esperado,
        ventas: resumen.cantidadVentas,
        notas: parsed.data.notas,
        creadoPorId: req.userId!,
        ...(turno ? { turnoId: turno.id } : {}),
      },
      include: { creadoPor: { select: { nombre: true } } },
    });
    if (turno) {
      await tx.turnoCaja.update({
        where: { id: turno.id },
        data: { estado: "CERRADO", cerradoAt: new Date(), cerradoPorId: req.userId! },
      });
    }
    return c;
  });
  res.status(201).json({ ...cierre, turno: turno ? { id: turno.id } : null, porEmpleado: resumen.porEmpleado });
});

// GET /caja/historial — últimos arqueos con su diferencia y su turno
cajaRouter.get("/historial", async (req: AuthRequest, res) => {
  const cierres = await prisma.cierreCaja.findMany({
    where: { negocioId: req.negocioId! },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      creadoPor: { select: { nombre: true } },
      turno: { select: { fondoInicial: true, abiertoPor: { select: { nombre: true } } } },
    },
  });
  res.json(cierres);
});
