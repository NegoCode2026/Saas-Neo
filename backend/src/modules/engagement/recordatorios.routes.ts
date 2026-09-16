import { Router } from "express";
import { prisma } from "../../config/prisma-client.js";
import { authMiddleware, type AuthRequest } from "../../shared/middleware/require-auth.js";

export const recordatoriosRouter = Router();
recordatoriosRouter.use(authMiddleware);

/* Centro de recordatorios por WhatsApp.
   No mandamos mensajes desde el servidor (todavía no hay API de WhatsApp):
   armamos el texto acá y el frontend abre el link wa.me. Así no cuesta nada
   y funciona con el WhatsApp que ya tiene el tendero. */

type Recordatorio = {
  tipo: "VENCIMIENTOS" | "BAJO_STOCK";
  titulo: string;
  cantidad: number;
  mensaje: string;
  items: { id: string; nombre: string; detalle: string }[];
};

function fmtFecha(d: Date): string {
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

// GET /recordatorios?dias=7 — vencimientos + bajo stock listos para mandar.
recordatoriosRouter.get("/", async (req: AuthRequest, res) => {
  const negocioId = req.negocioId!;
  const dias = Math.min(90, Math.max(1, Number(req.query.dias) || 7));
  const ahora = new Date();
  const limite = new Date(ahora.getTime() + dias * 86400000);

  const [negocio, productos] = await Promise.all([
    prisma.negocio.findUnique({ where: { id: negocioId }, select: { nombre: true, whatsapp: true } }),
    prisma.producto.findMany({
      where: { negocioId, activo: true },
      select: { id: true, nombre: true, stockActual: true, stockMinimo: true, fechaVencimiento: true },
    }),
  ]);

  const conFecha = productos
    .filter((p) => p.fechaVencimiento && p.fechaVencimiento <= limite)
    .sort((a, b) => a.fechaVencimiento!.getTime() - b.fechaVencimiento!.getTime());

  const vencidos = conFecha.filter((p) => p.fechaVencimiento! <= ahora);
  const proximos = conFecha.filter((p) => p.fechaVencimiento! > ahora);
  const bajoStock = productos.filter((p) => p.stockActual <= p.stockMinimo);

  const nombre = negocio?.nombre ?? "tu negocio";
  const lineasVenc = conFecha
    .map((p) => `- ${p.nombre} (vence ${fmtFecha(p.fechaVencimiento!)})`)
    .join("\n");
  const mensajeVencimientos = conFecha.length
    ? `Recordatorio de vencimientos de ${nombre}:\n${lineasVenc}\n\nRevisá y sacá de la vitrina lo vencido.`
    : `Todo al día en ${nombre}: sin vencimientos en los próximos ${dias} días.`;

  const lineasBajo = bajoStock.map((p) => `- ${p.nombre} (quedan ${p.stockActual})`).join("\n");
  const mensajeBajoStock = bajoStock.length
    ? `Productos por acabarse en ${nombre}:\n${lineasBajo}\n\nArmá el pedido antes de quedarte sin.`
    : `Sin productos en bajo stock en ${nombre}.`;

  const recordatorios: Recordatorio[] = [
    {
      tipo: "VENCIMIENTOS",
      titulo: "Vencimientos",
      cantidad: conFecha.length,
      mensaje: mensajeVencimientos,
      items: conFecha.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        detalle: `vence ${fmtFecha(p.fechaVencimiento!)} · ${p.stockActual} en stock`,
      })),
    },
    {
      tipo: "BAJO_STOCK",
      titulo: "Productos por acabarse",
      cantidad: bajoStock.length,
      mensaje: mensajeBajoStock,
      items: bajoStock.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        detalle: `quedan ${p.stockActual} (mínimo ${p.stockMinimo})`,
      })),
    },
  ];

  res.json({
    whatsapp: negocio?.whatsapp ?? null,
    negocio: nombre,
    dias,
    vencidos: vencidos.length,
    proximos: proximos.length,
    recordatorios,
  });
});
