import { api } from "@/lib/api-client";

export type ItemVentaInput = { productoId: string; cantidad: number };

export type CrearVentaBody = {
  items: ItemVentaInput[];
  descuento?: number;
};

export async function crearVenta(body: CrearVentaBody): Promise<unknown> {
  return api("/ventas", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
