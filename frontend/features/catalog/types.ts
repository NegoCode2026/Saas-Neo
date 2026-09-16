/* Catalog domain types (productos). Kept separate from api.ts so that file
   only holds data-access calls. */

export type Producto = {
  id: string;
  nombre: string;
  categoria?: string | null;
  stockActual: number;
  stockMinimo: number;
  precioVenta: number;
  precioCompra: number;
  codigoBarras?: string | null;
  fechaVencimiento?: string | null;
  fechaAgregado?: string | null;
};

export type Alerta = { id: string; nombre: string; stockActual: number; stockMinimo: number };

export type TopVendido = Producto & { vendidos: number };

export type Estancado = {
  id: string;
  nombre: string;
  stockActual: number;
  valor: number;
  ultimaVenta: string | null;
};

export type Estancados = { dias: number; totalValor: number; items: Estancado[] };

export type VencimientoProducto = {
  id: string;
  nombre: string;
  stockActual: number;
  fechaVencimiento: string;
};

export type Vencimientos = { vencidos: VencimientoProducto[]; proximos: VencimientoProducto[] };

/* Crear vs actualizar — la diferencia clave está en los campos de stock:

   - Crear (CrearProductoBody): se define el stock de apertura con
     `stockActual` y NO se envía `stockMinimo` (el servidor usa su default).
     Es el único momento en que el stock se fija "a mano".

   - Actualizar (ActualizarProductoBody): se ajusta el umbral de alerta con
     `stockMinimo`, pero `stockActual` NO existe a propósito. El stock nunca
     se edita directo: solo cambia por ventas, movimientos o conteo físico,
     para no perder la trazabilidad. */

export type CrearProductoBody = {
  nombre: string;
  categoria?: string;
  codigoBarras?: string;
  precioCompra: number;
  precioVenta: number;
  stockActual: number;
  fechaVencimiento?: string;
  fechaAgregado?: string;
};

export type ActualizarProductoBody = {
  nombre: string;
  categoria?: string;
  codigoBarras?: string;
  precioCompra: number;
  precioVenta: number;
  stockMinimo: number;
  fechaVencimiento: string | null;
  fechaAgregado?: string;
};

/* Listado único: todos los filtros son opcionales y el resultado siempre
   viene paginado con su total (X-Total-Count del backend). */
export type ListarProductosOpts = {
  search?: string;
  categoria?: string;
  limit?: number;
  offset?: number;
};

export type ListarProductosResult = { items: Producto[]; total: number };
