import { api } from "@/lib/api-client";

/* Engagement data access: WhatsApp reminders for expirations / low stock.
   URL namespace: /recordatorios. */

export type Recordatorio = {
  tipo: "VENCIMIENTOS" | "BAJO_STOCK";
  titulo: string;
  cantidad: number;
  mensaje: string;
  items: { id: string; nombre: string; detalle: string }[];
};

export type RecordatoriosData = {
  whatsapp: string | null;
  negocio: string;
  dias: number;
  vencidos: number;
  proximos: number;
  recordatorios: Recordatorio[];
};

export async function fetchRecordatorios(dias: number): Promise<RecordatoriosData> {
  return api<RecordatoriosData>(`/recordatorios?dias=${dias}`);
}
