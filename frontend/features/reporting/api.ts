import { api } from "@/lib/api-client";

/* Reporting data access: dashboard summary (last 30 days).
   CSV downloads are plain <a href> links served with the session cookie,
   so they don't go through this module. */

export type VentaResumen = {
  id: string;
  total: number;
  createdAt: string;
  items: { cantidad: number }[];
};

export type Resumen = {
  totalProductos: number;
  valorInventario: number;
  totalVentas: number;
  gananciaEstimada: number;
  totalGastos: number;
  gananciaReal: number;
  bajoStock: number;
  ultimasVentas: VentaResumen[];
};

export async function fetchResumen(): Promise<Resumen> {
  return api<Resumen>("/reportes/resumen");
}
