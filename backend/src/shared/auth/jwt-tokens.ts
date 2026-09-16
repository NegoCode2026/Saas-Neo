import jwt from "jsonwebtoken";
import { getJwtSecret, getJwtExpiresIn } from "../../config/env-config.js";

export function signToken(payload: { sub: string; negocioId: string; rol: "DUENO" | "EMPLEADO" }) {
  // SECRET se resuelve en cada firma (no en import) para que dotenv ya haya
  // cargado y para que un JWT_SECRET rotado aplique sin reiniciar imports.
  // Falla fuerte en producción si el secreto falta o es débil (ver env.ts).
  return jwt.sign(payload, getJwtSecret(), { expiresIn: getJwtExpiresIn() } as any);
}

export function verifyToken(token: string) {
  return jwt.verify(token, getJwtSecret()) as {
    sub: string;
    negocioId: string;
    rol: "DUENO" | "EMPLEADO";
  };
}
