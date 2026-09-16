"use client";

import { useEffect, useState } from "react";
import {
  cancelarPedido,
  crearPedido,
  enviarPedido,
  listarPedidos,
  listarProveedores,
  recibirPedido,
  adjuntarComprobante,
} from "@/features/purchasing/api";
import type { CrearPedidoBody, Pedido, PedidoEstado, Proveedor } from "@/features/purchasing/api";
import { listarProductos, buscarCodigoExacto } from "@/features/catalog/api";
import type { Producto } from "@/features/catalog/types";
import { fetchCurrentUser } from "@/features/auth/api";
import BarcodeCameraScanner from "../../components/sales/BarcodeCameraScanner";
import { toast } from "../../components/ui/ToastNotifications";
import { confirmDialog } from "../../components/ui/ConfirmDialog";
import { Badge, BtnPrimary, Card, EmptyState, Field, PageHeader, StatusMsg, inputCls } from "../../components/ui/SharedControls";

const tonoEstado: Record<PedidoEstado, "neutral" | "ok" | "warn" | "bad"> = {
  BORRADOR: "neutral",
  ENVIADO: "warn",
  RECIBIDO: "ok",
  CANCELADO: "bad",
};

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [provs, setProvs] = useState<Proveedor[]>([]);
  const [prods, setProds] = useState<Producto[]>([]);
  const [proveedorId, setProveedorId] = useState("");
  const [auto, setAuto] = useState(true);
  const [selProd, setSelProd] = useState("");
  const [selCant, setSelCant] = useState("1");
  const [items, setItems] = useState<{ productoId: string; nombre: string; cantidad: number }[]>([]);
  const [msg, setMsg] = useState("");
  const [scanner, setScanner] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState<string | null>(null);
  const [ampliada, setAmpliada] = useState<string | null>(null);

  async function load() {
    try {
      const [ps, prs, pds] = await Promise.all([
        listarPedidos(),
        listarProveedores(),
        listarProductos({ limit: 200 }),
      ]);
      setPedidos(ps);
      setProvs(prs);
      setProds(pds.items);
      if (!proveedorId && prs.length > 0) setProveedorId(prs[0].id);
      if (!selProd && pds.items.length > 0) setSelProd(pds.items[0].id);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? `Error: ${e.message}` : "No se pudo cargar");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      const body: Record<string, unknown> = auto
        ? { proveedorId, auto: true }
        : { proveedorId, items: items.map(({ productoId, cantidad }) => ({ productoId, cantidad })) };
      await crearPedido(body as CrearPedidoBody);
      toast(auto ? "Pedido armado desde el bajo stock." : "Pedido creado.");
      setItems([]);
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? `Error: ${e.message}` : "No se pudo crear");
    }
  }

  function whatsappLink(telefono: string, texto: string) {
    return `https://wa.me/${telefono.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;
  }

  async function enviar(p: Pedido) {
    try {
      const r = await enviarPedido(p.id);
      const me = await fetchCurrentUser();
      const lineas = r.items.map((it) => `- ${it.producto.nombre} x${it.cantidad}`).join("\n");
      const texto = `Hola ${r.proveedor.nombre}! Pedido de ${me.negocio.nombre}:\n${lineas}\nGracias!`;
      if (r.proveedor.telefono) window.open(whatsappLink(r.proveedor.telefono, texto), "_blank", "noopener");
      toast("Pedido enviado. Se abrió WhatsApp para mandarlo.");
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? `Error: ${e.message}` : "No se pudo enviar");
    }
  }

  async function recibir(p: Pedido) {
    const ok = await confirmDialog({
      titulo: "¿Llegó el pedido?",
      mensaje: `De ${p.proveedor.nombre}. Se suma al stock.`,
      confirmar: "Sí, llegó",
    });
    if (!ok) return;
    try {
      await recibirPedido(p.id);
      toast("Pedido recibido y sumado al stock.");
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? `Error: ${e.message}` : "No se pudo recibir");
    }
  }

  async function cancelar(p: Pedido) {
    const ok = await confirmDialog({
      titulo: "¿Cancelar este pedido?",
      mensaje: `El pedido a ${p.proveedor.nombre} queda cancelado.`,
      confirmar: "Cancelar pedido",
      danger: true,
    });
    if (!ok) return;
    try {
      await cancelarPedido(p.id);
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? `Error: ${e.message}` : "No se pudo cancelar");
    }
  }

  // Foto de la factura/remisión: se comprime en el celu antes de subir.
  function comprimirFoto(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const max = 1024;
        const escala = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * escala));
        const h = Math.max(1, Math.round(img.height * escala));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("No se pudo leer la imagen"));
      };
      img.src = url;
    });
  }

  async function subirComprobante(p: Pedido, file: File) {
    if (!file.type.startsWith("image/")) {
      setMsg("Error: el archivo debe ser una foto.");
      return;
    }
    setSubiendoFoto(p.id);
    try {
      const foto = await comprimirFoto(file);
      await adjuntarComprobante(p.id, foto);
      toast("Comprobante guardado.");
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? `Error: ${e.message}` : "No se pudo subir la foto");
    } finally {
      setSubiendoFoto(null);
    }
  }

  function agregarItem() {
    const prod = prods.find((x) => x.id === selProd);
    if (!prod) return;
    const cant = Math.max(1, Number(selCant) || 1);
    sumarAlPedido(prod.id, prod.nombre, cant);
  }

  function sumarAlPedido(productoId: string, nombre: string, cant: number) {
    setItems((prev) => {
      const ex = prev.find((x) => x.productoId === productoId);
      if (ex) return prev.map((x) => (x.productoId === productoId ? { ...x, cantidad: x.cantidad + cant } : x));
      return [...prev, { productoId, nombre, cantidad: cant }];
    });
  }

  // Armar escaneando: cada código suma 1 unidad (el escáner queda abierto).
  // Primero busca en lo ya cargado (instantáneo, sirve offline), si no va al servidor.
  async function onScanPedido(code: string) {
    const term = code.trim();
    if (!term) return;
    const local = prods.find((p) => (p.codigoBarras ?? "") === term);
    if (local) {
      sumarAlPedido(local.id, local.nombre, 1);
      toast(`Sumado: ${local.nombre}`);
      return;
    }
    try {
      const prod = await buscarCodigoExacto(term);
      if (prod) {
        sumarAlPedido(prod.id, prod.nombre, 1);
        toast(`Sumado: ${prod.nombre}`);
      } else {
        setMsg(`No existe producto con el código ${term}. Registralo primero.`);
      }
    } catch {
      setMsg("Sin conexión y ese código no está en lo cargado.");
    }
  }

  return (
    <div className="w-full space-y-4">
      <PageHeader title="Pedidos" hint="Armá desde el bajo stock, mandá por WhatsApp y al recibir se suma solo." />

      <div className="lg:grid lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div className="space-y-4 lg:sticky lg:top-6">
          <Card>
            <form onSubmit={crear} className="space-y-3">
              <Field label="Proveedor" htmlFor="ped-prov">
                <select
                  id="ped-prov"
                  className={inputCls}
                  value={proveedorId}
                  onChange={(e) => setProveedorId(e.target.value)}
                  required
                >
                  {provs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </Field>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-tienda-700"
                  checked={auto}
                  onChange={(e) => setAuto(e.target.checked)}
                />
                <span>
                  <span className="block font-bold text-tinta">Automático desde bajo stock</span>
                  <span className="block text-xs text-zinc-500">Sugiere reponer hasta 2x el mínimo</span>
                </span>
              </label>

              {!auto && (
                <div className="space-y-2 rounded-2xl border border-zinc-200 p-3">
                  <div className="flex gap-2">
                    <select
                      aria-label="Producto para el pedido"
                      className={`${inputCls} flex-1`}
                      value={selProd}
                      onChange={(e) => setSelProd(e.target.value)}
                    >
                      {prods.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                    <input
                      aria-label="Cantidad"
                      className={`${inputCls} w-20`}
                      inputMode="numeric"
                      value={selCant}
                      onChange={(e) => setSelCant(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={agregarItem}
                      className="press shrink-0 rounded-xl border border-zinc-300 px-4 font-bold hover:bg-zinc-100"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => setScanner(true)}
                      aria-label="Escanear código para sumar al pedido"
                      className="press shrink-0 rounded-xl border border-tienda-700 bg-tienda-50 px-4 font-bold text-tienda-800 hover:bg-tienda-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700"
                    >
                      Escanear
                    </button>
                  </div>
                  {items.length > 0 && (
                    <ul className="space-y-1 text-sm">
                      {items.map((it) => (
                        <li key={it.productoId} className="flex justify-between gap-2">
                          <span className="truncate">{it.nombre}</span>
                          <span className="font-bold tabular-nums">x{it.cantidad}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <BtnPrimary type="submit">Crear pedido</BtnPrimary>
            </form>
          </Card>
          <StatusMsg msg={msg} />
        </div>

        <div className="mt-4 space-y-3 lg:mt-0">
          {pedidos.length === 0 ? (
            <EmptyState title="Sin pedidos" hint="Creá el primero: automático desde el bajo stock." />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {pedidos.map((p) => (
                <li key={p.id} className="lift space-y-3 rounded-card border border-zinc-200 bg-white p-4 shadow-card">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tienda-50 text-base font-extrabold text-tienda-800"
                      >
                        {p.proveedor.nombre.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-base font-extrabold text-tinta">{p.proveedor.nombre}</p>
                        <p className="text-xs tabular-nums text-zinc-500">
                          {new Date(p.createdAt).toLocaleString("es-CO", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {p.creadoPor ? ` · por ${p.creadoPor.nombre}` : ""}
                        </p>
                      </div>
                    </div>
                    <Badge tone={tonoEstado[p.estado]}>{p.estado}</Badge>
                  </div>
                  <ul className="space-y-0.5 text-sm text-zinc-600">
                    {p.items.slice(0, 5).map((it) => (
                      <li key={it.id} className="flex justify-between gap-2">
                        <span className="truncate">{it.producto.nombre}</span>
                        <span className="font-bold tabular-nums">x{it.cantidad}</span>
                      </li>
                    ))}
                    {p.items.length > 5 && (
                      <li className="text-xs text-zinc-500">+{p.items.length - 5} productos más</li>
                    )}
                  </ul>
                  {p.comprobanteUrl && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setAmpliada(ampliada === p.id ? null : p.id)}
                        aria-expanded={ampliada === p.id}
                        className="press flex items-center gap-2 rounded-xl border border-zinc-200 p-2 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700"
                      >
                        <img
                          src={p.comprobanteUrl}
                          alt={`Comprobante del pedido a ${p.proveedor.nombre}`}
                          className="h-14 w-14 rounded-lg border border-zinc-200 object-cover"
                        />
                        <span className="text-xs font-bold text-zinc-600">
                          {ampliada === p.id ? "Ocultar comprobante" : "Ver comprobante"}
                        </span>
                      </button>
                      {ampliada === p.id && (
                        <img
                          src={p.comprobanteUrl}
                          alt="Comprobante ampliado"
                          className="w-full rounded-2xl border border-zinc-200"
                        />
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {p.estado === "BORRADOR" && (
                      <button
                        type="button"
                        onClick={() => enviar(p)}
                        className="press flex-1 rounded-xl bg-tienda-700 px-4 py-3 text-sm font-bold text-white hover:bg-tienda-800"
                      >
                        Enviar por WhatsApp
                      </button>
                    )}
                    {p.estado === "ENVIADO" && (
                      <>
                        <button
                          type="button"
                          onClick={() => recibir(p)}
                          className="press flex-1 rounded-xl bg-tienda-700 px-4 py-3 text-sm font-bold text-white hover:bg-tienda-800"
                        >
                          Marcar recibido
                        </button>
                        <label className="press inline-flex min-h-[48px] cursor-pointer items-center rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold text-zinc-600 hover:bg-zinc-100 focus-within:outline-none focus-within:ring-2 focus-within:ring-tienda-700">
                          {subiendoFoto === p.id ? "Subiendo..." : "Foto factura"}
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="sr-only"
                            disabled={subiendoFoto !== null}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              e.target.value = "";
                              if (f) subirComprobante(p, f);
                            }}
                          />
                        </label>
                      </>
                    )}
                    {p.estado === "RECIBIDO" && !p.comprobanteUrl && (
                      <label className="press inline-flex min-h-[48px] cursor-pointer items-center rounded-xl border border-zinc-300 px-4 py-3 text-sm font-bold text-zinc-600 hover:bg-zinc-100 focus-within:outline-none focus-within:ring-2 focus-within:ring-tienda-700">
                        {subiendoFoto === p.id ? "Subiendo..." : "Agregar foto"}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="sr-only"
                          disabled={subiendoFoto !== null}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = "";
                            if (f) subirComprobante(p, f);
                          }}
                        />
                      </label>
                    )}
                    {(p.estado === "BORRADOR" || p.estado === "ENVIADO") && (
                      <button
                        type="button"
                        onClick={() => cancelar(p)}
                        className="press rounded-xl px-4 py-3 text-sm font-bold text-zinc-500 hover:bg-zinc-100 hover:text-peligro"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {scanner && (
        <BarcodeCameraScanner
          title="Escanear para el pedido"
          continuo
          pie={
            items.length > 0
              ? `${items.reduce((n, it) => n + it.cantidad, 0)} en el pedido. Seguí escaneando o cerrá.`
              : "Escaneá los productos. Cada código suma 1 unidad."
          }
          onClose={() => setScanner(false)}
          onDetect={onScanPedido}
        />
      )}
    </div>
  );
}
