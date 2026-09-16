import { api } from "@/lib/api-client";

/* Business settings data access: profile updates (owner-only on the backend).
   Currently used for the reminder WhatsApp number. */

export async function actualizarWhatsapp(whatsapp: string | null): Promise<unknown> {
  return api("/negocio", { method: "PATCH", body: JSON.stringify({ whatsapp }) });
}
