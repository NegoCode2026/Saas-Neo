const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/* La sesión viaja en cookie httpOnly: el JS no ve el token (a prueba de XSS).
   `credentials: "include"` es obligatorio para que el navegador la mande/reciba. */
export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers ?? {}),
    },
  });
  if (res.status === 401 && typeof window !== "undefined") {
    if (!window.location.pathname.startsWith("/login")) window.location.href = "/login";
    throw new Error("Sesión vencida, ingresá de nuevo");
  }
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: unknown };
    const msg = typeof j.error === "string" ? j.error : `Error ${res.status}`;
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function logout() {
  await fetch(`${BASE}/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
}

/* Como api(), pero devuelve el total de filas desde X-Total-Count (paginación). */
export async function apiPaginado<T>(path: string): Promise<{ items: T[]; total: number }> {
  const res = await fetch(`${BASE}${path}`, { credentials: "include" });
  if (res.status === 401 && typeof window !== "undefined") {
    if (!window.location.pathname.startsWith("/login")) window.location.href = "/login";
    throw new Error("Sesión vencida, ingresá de nuevo");
  }
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: unknown };
    throw new Error(typeof j.error === "string" ? j.error : `Error ${res.status}`);
  }
  const total = Number(res.headers.get("X-Total-Count") ?? 0);
  return { items: (await res.json()) as T[], total };
}

export const fmtCOP = (centavos: number) => `$${(centavos / 100).toLocaleString("es-CO")}`;
