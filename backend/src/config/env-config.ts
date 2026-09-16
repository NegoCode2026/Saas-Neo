/* Validación centralizada de secretos.
   Regla de oro: ningún secreto puede tener fallback débil.
   - En producción: JWT_SECRET es obligatorio y >= 32 caracteres, si no el
     proceso muere al arrancar (fail-fast) en vez de firmar con clave conocida.
   - En desarrollo/test: se permite clave corta solo para no frenar el DX,
     pero se avisa por consola. */

function leerEnv(nombre: string): string | undefined {
  const v = process.env[nombre];
  return v && v.length ? v : undefined;
}

export function getJwtSecret(): string {
  const secret = leerEnv("JWT_SECRET");
  const esProd = process.env.NODE_ENV === "production";
  if (!secret) {
    if (esProd) {
      throw new Error(
        "Falta JWT_SECRET en producción. Configuralo como variable de entorno (mín. 32 caracteres). El servidor no arranca sin él."
      );
    }
    console.warn("[seguridad] JWT_SECRET no definido: usando clave solo para desarrollo. NUNCA uses esto en producción.");
    return "solo-desarrollo-no-usar-en-produccion-00000000";
  }
  if (secret.length < 32) {
    if (esProd) {
      throw new Error("JWT_SECRET demasiado corto en producción (mín. 32 caracteres). Generá uno con: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"");
    }
    console.warn("[seguridad] JWT_SECRET muy corto: solo aceptable en desarrollo.");
  }
  if (secret === "cambia-esto-en-produccion-min-32-chars" || secret === "dev-secret-cambiar") {
    if (esProd) {
      throw new Error("JWT_SECRET tiene el valor de ejemplo. Generá un secreto real y único para producción.");
    }
    console.warn("[seguridad] JWT_SECRET es el valor de ejemplo. Cambialo antes de desplegar.");
  }
  return secret;
}

export function getJwtExpiresIn(): string {
  // Lista cerrada: evita que una variable mal configurada genere tokens eternos.
  const v = leerEnv("JWT_EXPIRES_IN") ?? "8h";
  if (/^(\d+[hmd]|\d+)$/.test(v)) return v;
  console.warn(`[seguridad] JWT_EXPIRES_IN inválido (${v}): usando 8h.`);
  return "8h";
}

export function getFrontendUrl(): string {
  return leerEnv("FRONTEND_URL") ?? "http://localhost:3000";
}
