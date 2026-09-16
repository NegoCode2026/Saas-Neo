import { Router } from "express";
import { prisma } from "../../config/prisma-client.js";
import { authMiddleware, type AuthRequest } from "../../shared/middleware/require-auth.js";
import { abrirSchema } from "./cashier-shifts.schemas.js";

/* Cashier shifts API (URL /turnos): who opened the register, opening float and per-employee sales. Renamed from turnos.ts. */
export const turnosRouter = Router();
turnosRouter.use(authMiddleware);

/* Turnos de caja: quién abrió, con cuánto fondo y cuánto vendió cada uno.
   El cierre (POST /caja/cerrar) enlaza el turno abierto y lo marca CERRADO.
   Sin turno abierto, la caja funciona como antes (desde el último cierre). */

export type VentaPorEmpleado = {
  id: string | null;
  nombre: string;
  ventas: number;
  total: number;
  efectivo: number;
};

// Resumen de un período: esperado en efectivo (+ fondo) y ventas por empleado.
export async function resumenCaja(negocioId: string, desde: Date, fondoInicial = 0) {
  const ventas = await prisma.venta.findMany({
    where: { negocioId, createdAt: { gt: desde } },
    select: {
      total: true,
      metodoPago: true,
      creadoPor: { select: { id: true, nombre: true } },
    },
  });
  let esperado = fondoInicial;
  let cantidadVentas = 0;
  const por = new Map<string, VentaPorEmpleado>();
  for (const v of ventas) {
    if (v.metodoPago === "EFECTIVO") {
      esperado += v.total;
      cantidadVentas++;
    }
    const key = v.creadoPor?.id ?? "-";
    const actual = por.get(key) ?? {
      id: v.creadoPor?.id ?? null,
      nombre: v.creadoPor?.nombre ?? "Sin registrar",
      ventas: 0,
      total: 0,
      efectivo: 0,
    };
    actual.ventas++;
    actual.total += v.total;
    if (v.metodoPago === "EFECTIVO") actual.efectivo += v.total;
    por.set(key, actual);
  }
  return {
    esperado,
    cantidadVentas,
    porEmpleado: [...por.values()].sort((a, b) => b.total - a.total),
  };
}

// El turno abierto del negocio (invariante: a lo sumo uno).
export async function turnoAbierto(negocioId: string) {
  return prisma.turnoCaja.findFirst({
    where: { negocioId, estado: "ABIERTO" },
    orderBy: { abiertoAt: "desc" },
    include: { abiertoPor: { select: { nombre: true } } },
  });
}

// GET /turnos/actual — turno abierto con su resumen, o { turno: null }.
turnosRouter.get("/actual", async (req: AuthRequest, res) => {
  const negocioId = req.negocioId!;
  const turno = await turnoAbierto(negocioId);
  if (!turno) return res.json({ turno: null });
  res.json({ turno, ...(await resumenCaja(negocioId, turno.abiertoAt, turno.fondoInicial)) });
});

// POST /turnos/abrir — un solo turno abierto por negocio a la vez.
turnosRouter.post("/abrir", async (req: AuthRequest, res) => {
  const parsed = abrirSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const negocioId = req.negocioId!;
  if (await turnoAbierto(negocioId)) {
    return res.status(400).json({ error: "Ya hay un turno abierto. Cerralo antes de abrir otro." });
  }
  const turno = await prisma.turnoCaja.create({
    data: {
      negocioId,
      fondoInicial: parsed.data.fondoInicial,
      abiertoPorId: req.userId!,
    },
    include: { abiertoPor: { select: { nombre: true } } },
  });
  res.status(201).json(turno);
});
