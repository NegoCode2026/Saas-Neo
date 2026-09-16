import { api, apiPaginado } from "@/lib/api-client";
import type {
  Alerta,
  ActualizarProductoBody,
  CrearProductoBody,
  Estancados,
  ListarProductosOpts,
  ListarProductosResult,
  Producto,
  TopVendido,
  Vencimientos,
} from "./types";

/* Catalog data access (productos). Only HTTP calls live here; the shapes are
   in ./types. URL namespace: /productos. */

/* Listado único de productos: filtra por texto/categoría y pagina. Devuelve
   el total junto a los ítems (X-Total-Count) para poder hacer "cargar más". */
export async function listarProductos(opts: ListarProductosOpts = {}): Promise<ListarProductosResult> {
  const params = new URLSearchParams();
  if (opts.search) params.set("search", opts.search);
  if (opts.categoria) params.set("categoria", opts.categoria);
  if (opts.limit !== undefined) params.set("limit", String(opts.limit));
  if (opts.offset !== undefined) params.set("offset", String(opts.offset));
  const qs = params.toString();
  return apiPaginado<Producto>(qs ? `/productos?${qs}` : "/productos");
}

/* Búsqueda EXACTA de código de barras: consulta dedicada en el backend
   (no el buscador difuso) para detectar duplicados de forma confiable.
   `excluirId` deja que un producto conserve su propio código al editarse. */
export async function buscarCodigoExacto(code: string, excluirId?: string): Promise<Producto | null> {
  const limpio = code.trim();
  if (!limpio) return null;
  const params = new URLSearchParams({ codigo: limpio });
  if (excluirId) params.set("excluir", excluirId);
  return api<Producto | null>(`/productos/por-codigo?${params}`);
}

/* Lista liviana y completa para el caché offline del POS. */
export async function fetchCatalogo(): Promise<Producto[]> {
  return api<Producto[]>("/productos/catalogo");
}

export async function fetchMasVendidos(limite = 8): Promise<TopVendido[]> {
  return api<TopVendido[]>(`/productos/mas-vendidos?limite=${limite}`);
}

export async function fetchAlertas(): Promise<Alerta[]> {
  return api<Alerta[]>("/productos/alertas");
}

export async function fetchCategorias(): Promise<string[]> {
  return api<string[]>("/productos/categorias");
}

export async function fetchEstancados(dias: number): Promise<Estancados> {
  return api<Estancados>(`/productos/estancados?dias=${dias}`);
}

export async function fetchVencimientos(dias: number): Promise<Vencimientos> {
  return api<Vencimientos>(`/productos/vencimientos?dias=${dias}`);
}

export async function crearProducto(body: CrearProductoBody): Promise<Producto> {
  return api<Producto>("/productos", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function actualizarProducto(id: string, body: ActualizarProductoBody): Promise<Producto> {
  return api<Producto>(`/productos/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function eliminarProducto(id: string): Promise<void> {
  await api(`/productos/${id}`, { method: "DELETE" });
}
