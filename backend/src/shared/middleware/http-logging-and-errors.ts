import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "./require-auth.js";

/* Log estructurado por request: método, ruta (sin query: ahí puede ir data),
   estado, duración y negocio cuando hay sesión. Cuerpos nunca se loguean.
   OJO: se usa originalUrl porque Express muta req.url/req.path dentro de routers. */
export function requestLog(req: AuthRequest, res: Response, next: NextFunction) {
  const start = Date.now();
  const ruta = req.originalUrl.split("?")[0];
  res.on("finish", () => {
    const ms = Date.now() - start;
    const linea = `[api] ${req.method} ${ruta} ${res.statusCode} ${ms}ms${
      req.negocioId ? ` negocio=${req.negocioId}` : ""
    }`;
    if (res.statusCode >= 500) console.error(linea);
    else if (res.statusCode >= 400) console.warn(linea);
    else console.log(linea);
  });
  next();
}

/* 404 para rutas desconocidas (los routers ya manejan las suyas). */
export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "No encontrado" });
}

/* Errores no manejados: se loguea el stack y el cliente recibe un 500 genérico
   (nunca se filtran detalles internos ni del driver de la DB). */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error("[api] error no manejado:", err instanceof Error ? (err.stack ?? err.message) : err);
  res.status(500).json({ error: "Error interno. Intentá de nuevo." });
}
