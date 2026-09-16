import { api } from "@/lib/api-client";

/* Cash data access: register count (arqueo), cashier shifts and expenses.
   URL namespaces: /caja, /turnos and /gastos. */

export type Cierre = {
  id: string;
  esperado: number;
  contado: number;
  diferencia: number;
  ventas: number;
  notas?: string | null;
  createdAt: string;
  creadoPor?: { nombre: string } | null;
  turno?: { fondoInicial: number; abiertoPor?: { nombre: string } | null } | null;
};

export type Turno = {
  id: string;
  fondoInicial: number;
  abiertoAt: string;
  abiertoPor?: { nombre: string } | null;
};

export type PorEmpleado = {
  id: string | null;
  nombre: string;
  ventas: number;
  total: number;
  efectivo: number;
};

export type CajaActual = {
  desde: string;
  esperado: number;
  cantidadVentas: number;
  ultimoCierre: Cierre | null;
  turno: Turno | null;
  porEmpleado: PorEmpleado[];
};

export type Gasto = {
  id: string;
  concepto: string;
  categoria?: string | null;
  monto: number;
  fecha: string;
  creadoPor?: { nombre: string } | null;
};

export type CrearGastoBody = {
  concepto: string;
  categoria?: string;
  monto: number;
  fecha?: string;
};

export async function fetchCajaActual(): Promise<CajaActual> {
  return api<CajaActual>("/caja/actual");
}

export async function fetchCajaHistorial(): Promise<Cierre[]> {
  return api<Cierre[]>("/caja/historial");
}

export async function abrirTurno(fondoInicial: number): Promise<unknown> {
  return api("/turnos/abrir", {
    method: "POST",
    body: JSON.stringify({ fondoInicial }),
  });
}

export async function cerrarCaja(contado: number, notas?: string): Promise<unknown> {
  return api("/caja/cerrar", {
    method: "POST",
    body: JSON.stringify({ contado, ...(notas ? { notas } : {}) }),
  });
}

export async function listarGastos(): Promise<Gasto[]> {
  return api<Gasto[]>("/gastos");
}

export async function crearGasto(body: CrearGastoBody): Promise<unknown> {
  return api("/gastos", { method: "POST", body: JSON.stringify(body) });
}

export async function eliminarGasto(id: string): Promise<unknown> {
  return api(`/gastos/${id}`, { method: "DELETE" });
}
