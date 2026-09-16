import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../auth/jwt-tokens.js";
import { COOKIE_NAME } from "../auth/session-cookies.js";
import { runWithTenant } from "../tenant/tenant-context.js";

export interface AuthRequest extends Request {
  userId?: string;
  negocioId?: string;
  rol?: "DUENO" | "EMPLEADO";
}

// Concepto clave: el negocioId NUNCA viene del body/query.
// Sale del JWT firmado. Así garantizás aislamiento multi-tenant.
// El token viaja en cookie httpOnly (navegador) o Bearer (clientes API).
//
// Además, todo lo que corre aguas abajo (handlers incluidos) queda dentro
// del contexto de tenant: la extensión de Prisma inyecta el negocioId en
// cada query automáticamente (ver config/prisma-client.ts).
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.[COOKIE_NAME];
  const header = req.headers.authorization;
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const token = cookieToken ?? bearer;

  if (!token) return res.status(401).json({ error: "No autorizado" });
  // Defensa: el Bearer o la cookie no deben viajar con espacios/saltos que
  // indiquen header injection. Rechazo temprano y genérico (sin detalles).
  if (token.length > 4096 || /[\r\n]/.test(token)) {
    return res.status(401).json({ error: "No autorizado" });
  }

  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    req.negocioId = payload.negocioId;
    req.rol = payload.rol;
    // El contexto de tenant envuelve al resto de la cadena de middleware.
    runWithTenant(payload.negocioId, () => next());
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
}

export function requireDueno(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.rol !== "DUENO") return res.status(403).json({ error: "Solo dueño" });
  next();
}
