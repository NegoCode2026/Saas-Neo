import { api } from "@/lib/api-client";

/* Auth data access: session lifecycle + current user.
   All requests go through the httpOnly cookie (no token in JS). */

export type LoginPayload = { email: string; password: string };
export type RegisterPayload = { negocio: string; nombre: string; email: string; password: string };
export type ForgotResponse = { ok: boolean; devLink?: string };
export type ResetPayload = { token: string; password: string };

export type CurrentUser = {
  id: string;
  nombre: string;
  email: string;
  rol: "DUENO" | "EMPLEADO";
  negocio: { id: string; nombre: string };
};

export async function login(payload: LoginPayload): Promise<unknown> {
  return api("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function register(payload: RegisterPayload): Promise<unknown> {
  return api("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function forgotPassword(email: string): Promise<ForgotResponse> {
  return api<ForgotResponse>("/auth/forgot", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(payload: ResetPayload): Promise<unknown> {
  return api("/auth/reset", { method: "POST", body: JSON.stringify(payload) });
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  return api<CurrentUser>("/auth/me");
}

export async function logout(): Promise<void> {
  await api("/auth/logout", { method: "POST" }).catch(() => {});
}
