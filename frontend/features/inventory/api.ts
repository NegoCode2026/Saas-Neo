import { api } from "@/lib/api-client";

export type Movimiento = {
  id: string;
  tipo: "ENTRADA" | "SALIDA" | "AJUSTE";
  cantidad: number;
  motivo?: string | null;
  createdAt: string;
  producto: { id: string; nombre: string };
  creadoPor?: { id: string; nombre: string } | null;
};

export type CrearMovimientoBody = {
  productoId: string;
  tipo: string;
  cantidad: number;
  motivo?: string;
};

export type ConteoItemInput = { productoId: string; contado: number };

export type ResumenItemConteo = {
  productoId: string;
  nombre: string;
  antes: number;
  contado: number;
  diferencia: number;
};

export type ResumenConteo = {
  ajustados: number;
  sinCambios: number;
  faltantesUnidades: number;
  faltantesValor: number;
  sobrantesUnidades: number;
  sobrantesValor: number;
  items: ResumenItemConteo[];
};

export async function fetchMovimientos(): Promise<Movimiento[]> {
  return api<Movimiento[]>("/movimientos");
}

export async function crearMovimiento(body: CrearMovimientoBody): Promise<unknown> {
  return api("/movimientos", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function aplicarConteo(items: ConteoItemInput[]): Promise<ResumenConteo> {
  return api<ResumenConteo>("/conteos", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}
