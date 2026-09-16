import { Router } from "express";
import { authMiddleware, type AuthRequest } from "../../shared/middleware/require-auth.js";
import { sendCsvResponse } from "../../shared/http/csv-response.js";
import { rangoQuery } from "./reports.schemas.js";
import {
  getDashboardSummary,
  listCierresCsvRows,
  listGastosCsvRows,
  listInventarioCsvRows,
  listVentasCsvRows,
} from "./reports.service.js";

export const reportsRouter = Router();

// GET /reportes/resumen — protegido, todo filtrado por negocioId del JWT.
// Ventana: últimos 30 días (coincide con "Ventas Mes" del dashboard).
reportsRouter.get("/resumen", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    res.json(await getDashboardSummary(req.negocioId!));
  } catch (err) {
    next(err);
  }
});

// GET /reportes/ventas.csv?desde=&hasta= — una fila por ítem vendido
reportsRouter.get("/ventas.csv", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const parsed = rangoQuery.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: "Fechas inválidas (usá ISO, ej. 2026-09-01)" });
    const { desde, hasta } = parsed.data;
    const rows = await listVentasCsvRows(req.negocioId!, desde, hasta);
    sendCsvResponse(res, "ventas.csv", ["fecha", "venta_id", "producto", "cantidad", "precio_unit", "subtotal", "vendedor"], rows);
  } catch (err) {
    next(err);
  }
});

// GET /reportes/inventario.csv — foto del stock con valorización
reportsRouter.get("/inventario.csv", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const rows = await listInventarioCsvRows(req.negocioId!);
    sendCsvResponse(
      res,
      "inventario.csv",
      ["nombre", "categoria", "codigo_barras", "stock", "stock_minimo", "precio_compra", "precio_venta", "valor_stock"],
      rows
    );
  } catch (err) {
    next(err);
  }
});

// GET /reportes/gastos.csv?desde=&hasta= — egresos para el contador
reportsRouter.get("/gastos.csv", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const parsed = rangoQuery.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: "Fechas inválidas (usá ISO, ej. 2026-09-01)" });
    const { desde, hasta } = parsed.data;
    const rows = await listGastosCsvRows(req.negocioId!, desde, hasta);
    sendCsvResponse(
      res,
      "gastos.csv",
      ["fecha", "concepto", "categoria", "monto", "registrado_por"],
      rows
    );
  } catch (err) {
    next(err);
  }
});

// GET /reportes/caja.csv — historial de arqueos con diferencias
reportsRouter.get("/caja.csv", authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const rows = await listCierresCsvRows(req.negocioId!);
    sendCsvResponse(
      res,
      "caja.csv",
      ["fecha", "esperado", "contado", "diferencia", "ventas_efectivo", "notas", "cerrado_por"],
      rows
    );
  } catch (err) {
    next(err);
  }
});
