import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { prisma } from "./config/prisma-client.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { productosRouter } from "./modules/catalog/productos.routes.js";
import { ventasRouter } from "./modules/sales/ventas.routes.js";
import { movimientosRouter } from "./modules/inventory/movimientos.routes.js";
import { pedidosRouter } from "./modules/purchasing/pedidos.routes.js";
import { proveedoresRouter } from "./modules/purchasing/proveedores.routes.js";
import { cajaRouter } from "./modules/cash/cash-register.routes.js";
import { gastosRouter } from "./modules/cash/gastos.routes.js";
import { usuariosRouter } from "./modules/team/usuarios.routes.js";
import { negocioRouter } from "./modules/business/business-settings.routes.js";
import { recordatoriosRouter } from "./modules/engagement/recordatorios.routes.js";
import { conteosRouter } from "./modules/inventory/stock-counts.routes.js";
import { turnosRouter } from "./modules/cash/cashier-shifts.routes.js";
import { reportsRouter } from "./modules/reporting/reports.routes.js";
import { requestLog, notFound, errorHandler } from "./shared/middleware/http-logging-and-errors.js";
import { getJwtSecret, getFrontendUrl } from "./config/env-config.js";

/* Fail-fast: si el secreto falta o es débil en producción, el proceso muere
   acá al arrancar en vez de firmar tokens con una clave conocida. */
getJwtSecret();

/* App sin listen: así los tests la levantan en un puerto efímero. */
export const app = express();

// Detrás de proxy (Render) para que secure cookies y el rate limit vean la IP real.
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);

// Headers de seguridad (API JSON: sin CSP que rompa nada del front).
app.use(helmet({ contentSecurityPolicy: false }));

/* Rate limit global: 600 req / 15 min por IP. Las rutas sensibles
   (/auth) tienen su propio límite más estricto. */
app.use(
  "/",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
    message: { error: "Demasiadas peticiones. Esperá un momento." },
  })
);

app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:3000", credentials: true }));
app.use(cookieParser());
// Defensa CSRF para cookies cross-site (SameSite=None en prod):
// los navegadores mandan Origin en POST/PUT/PATCH/DELETE. Si viene y no
// coincide con FRONTEND_URL, se bloquea. Los clientes API con Bearer sin
// Origin siguen pasando (no usan cookies).
const FRONTEND_ORIGIN = getFrontendUrl().replace(/\/$/, "");
app.use((req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const origin = req.headers.origin;
    if (origin && origin !== FRONTEND_ORIGIN) {
      return res.status(403).json({ error: "Origen no permitido" });
    }
  }
  next();
});
app.use(express.json({ limit: "2mb" })); // fotos de comprobantes (comprimidas en cliente) + payloads chicos
app.use(requestLog);

// Health con chequeo real de DB: sirve para uptime monitors y orquestadores.
// 200 = todo bien, 503 = la base no responde.
app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, service: "stocklocal-api", db: "up", uptime: Math.round(process.uptime()) });
  } catch {
    res.status(503).json({ ok: false, service: "stocklocal-api", db: "down" });
  }
});

app.use("/auth", authRouter);
app.use("/productos", productosRouter);
app.use("/ventas", ventasRouter);
app.use("/movimientos", movimientosRouter);
app.use("/pedidos", pedidosRouter);
app.use("/proveedores", proveedoresRouter);
app.use("/caja", cajaRouter);
app.use("/gastos", gastosRouter);
app.use("/usuarios", usuariosRouter);
app.use("/negocio", negocioRouter);
app.use("/recordatorios", recordatoriosRouter);
app.use("/conteos", conteosRouter);
app.use("/turnos", turnosRouter);
app.use("/reportes", reportsRouter);

// 404 + manejador central de errores: van últimos, sí o sí.
app.use(notFound);
app.use(errorHandler);
