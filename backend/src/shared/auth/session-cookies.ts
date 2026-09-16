import type { Response } from "express";

export const COOKIE_NAME = "stocklocal_token";

const MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8h, alineado con JWT_EXPIRES_IN

function esProd() {
  return process.env.NODE_ENV === "production";
}

/* Cookie httpOnly: el navegador la manda sola y el JS no la puede leer,
   así un XSS no se lleva el token. En prod front y back viven en dominios
   distintos, por eso SameSite=None + Secure (requiere HTTPS). */
export function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: esProd() ? "none" : "lax",
    secure: esProd(),
    maxAge: MAX_AGE_MS,
    path: "/",
  });
}

export function clearSessionCookie(res: Response) {
  // Los flags deben coincidir con setSessionCookie o el navegador NO borra
  // la cookie en producción cross-site (mismo path + sameSite + secure).
  res.clearCookie(COOKIE_NAME, {
    path: "/",
    httpOnly: true,
    sameSite: esProd() ? "none" : "lax",
    secure: esProd(),
  });
}
