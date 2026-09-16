import { api } from "@/lib/api-client";

/* Purchasing data access: suppliers and purchase orders.
   URL namespaces: /proveedores and /pedidos. */

export type Proveedor = { id: string; nombre: string; telefono?: string | null };
export type CrearProveedorBody = { nombre: string; telefono?: string };

export type PedidoEstado = "BORRADOR" | "ENVIADO" | "RECIBIDO" | "CANCELADO";

export type PedidoItem = {
  id: string;
  cantidad: number;
  producto: { id: string; nombre: string };
};

export type Pedido = {
  id: string;
  estado: PedidoEstado;
  createdAt: string;
  comprobanteUrl?: string | null;
  proveedor: { id: string; nombre: string; telefono?: string | null };
  items: PedidoItem[];
  creadoPor?: { nombre: string } | null;
};

export type CrearPedidoBody = {
  proveedorId: string;
  items: { productoId: string; cantidad: number }[];
};

export async function listarProveedores(): Promise<Proveedor[]> {
  return api<Proveedor[]>("/proveedores");
}

export async function crearProveedor(body: CrearProveedorBody): Promise<unknown> {
  return api("/proveedores", { method: "POST", body: JSON.stringify(body) });
}

export async function eliminarProveedor(id: string): Promise<unknown> {
  return api(`/proveedores/${id}`, { method: "DELETE" });
}

export async function listarPedidos(): Promise<Pedido[]> {
  return api<Pedido[]>("/pedidos");
}

export async function crearPedido(body: CrearPedidoBody): Promise<unknown> {
  return api("/pedidos", { method: "POST", body: JSON.stringify(body) });
}

export async function enviarPedido(id: string): Promise<Pedido> {
  return api<Pedido>(`/pedidos/${id}/enviar`, { method: "POST" });
}

export async function recibirPedido(id: string): Promise<unknown> {
  return api(`/pedidos/${id}/recibir`, { method: "POST" });
}

export async function cancelarPedido(id: string): Promise<unknown> {
  return api(`/pedidos/${id}/cancelar`, { method: "POST" });
}

export async function adjuntarComprobante(id: string, foto: string): Promise<Pedido> {
  return api<Pedido>(`/pedidos/${id}/comprobante`, {
    method: "POST",
    body: JSON.stringify({ foto }),
  });
}
