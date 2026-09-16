"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { crearProveedor, eliminarProveedor, listarProveedores } from "@/features/purchasing/api";
import type { Proveedor } from "@/features/purchasing/api";
import { fetchAlertas } from "@/features/catalog/api";
import { fetchCurrentUser } from "@/features/auth/api";
import { BtnPrimary, Card, EmptyState, Field, PageHeader, StatusMsg, inputCls } from "../../components/ui/SharedControls";
import { toast } from "../../components/ui/ToastNotifications";
import { confirmDialog } from "../../components/ui/ConfirmDialog";

export default function ProveedoresPage() {
  const [provs, setProvs] = useState<Proveedor[]>([]);
  const [form, setForm] = useState({ nombre: "", telefono: "" });
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      setProvs(await listarProveedores());
    } catch (e: unknown) {
      setMsg(e instanceof Error ? `Error: ${e.message}` : "No se pudo cargar");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Guardando...");
    try {
      await crearProveedor(form);
      setMsg("");
      toast("Proveedor guardado.");
      setForm({ nombre: "", telefono: "" });
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? `Error: ${e.message}` : "No se pudo guardar");
    }
  }

  async function borrar(id: string, nombre: string) {
    const ok = await confirmDialog({
      titulo: `¿Borrar a ${nombre}?`,
      mensaje: "Se borra de tu lista de proveedores.",
      confirmar: "Borrar",
      danger: true,
    });
    if (!ok) return;
    try {
      await eliminarProveedor(id);
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? `Error: ${e.message}` : "No se pudo borrar");
    }
  }

  // Arma el pedido con lo que está en bajo stock y abre WhatsApp listo para enviar.
  async function pedirPorWhatsApp(p: Proveedor) {
    if (!p.telefono) return;
    setMsg("Armando el pedido con lo que está bajo...");
    try {
      const [me, alertas] = await Promise.all([
        fetchCurrentUser(),
        fetchAlertas(),
      ]);
      const lineas = alertas
        .slice(0, 20)
        .map((a) => `- ${a.nombre} (quedan ${a.stockActual})`)
        .join("\n");
      const texto =
        `Hola ${p.nombre}! Soy ${me.negocio.nombre}.\n` +
        `Quiero pedir:\n${lineas || "(revisar stock juntos)"}\nGracias!`;
      window.open(
        `https://wa.me/${p.telefono.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`,
        "_blank",
        "noopener"
      );
      setMsg("");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? `Error: ${e.message}` : "No se pudo armar el pedido");
    }
  }

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="Proveedores"
        hint="A quién le comprás y su WhatsApp a la mano."
        action={
          <Link
            href="/pedidos"
            className="press shrink-0 rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-sm font-bold text-tinta hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700"
          >
            Ver pedidos
          </Link>
        }
      />

      <div className="lg:grid lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div className="space-y-4 lg:sticky lg:top-6">
          <Card>
            <form onSubmit={crear} className="space-y-3">
              <Field label="Nombre *" htmlFor="prov-nombre">
                <input
                  id="prov-nombre"
                  className={inputCls}
                  placeholder="Ej. Distribuidora El Café"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  required
                  autoComplete="off"
                />
              </Field>
              <Field label="WhatsApp / teléfono" htmlFor="prov-tel">
                <input
                  id="prov-tel"
                  className={inputCls}
                  inputMode="tel"
                  placeholder="Ej. 315 123 4567"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  autoComplete="off"
                />
              </Field>
              <BtnPrimary type="submit">Agregar proveedor</BtnPrimary>
            </form>
          </Card>
          <StatusMsg msg={msg} />
        </div>

        <div className="mt-4 space-y-3 lg:mt-0">
          {provs.length === 0 ? (
            <EmptyState title="Sin proveedores" hint="Agregá al primero para pedir rápido por WhatsApp." />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {provs.map((p) => (
                <li
                  key={p.id}
                  className="lift space-y-3 rounded-card border border-zinc-200 bg-white p-4 shadow-card"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50 text-base font-extrabold text-amber-800"
                    >
                      {p.nombre.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-base font-extrabold text-tinta">{p.nombre}</p>
                      <p className="truncate text-xs tabular-nums text-zinc-500">
                        {p.telefono ? `WhatsApp ${p.telefono}` : "Sin teléfono"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {p.telefono && (
                      <button
                        type="button"
                        aria-label={`Pedir a ${p.nombre} por WhatsApp`}
                        onClick={() => pedirPorWhatsApp(p)}
                        className="press flex-1 rounded-xl border border-tienda-700 bg-tienda-50 px-4 py-3 text-sm font-bold text-tienda-800 hover:bg-tienda-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700"
                      >
                        Pedir por WhatsApp
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={`Borrar a ${p.nombre}`}
                      onClick={() => borrar(p.id, p.nombre)}
                      className="press rounded-xl px-4 py-3 text-sm font-bold text-zinc-500 hover:bg-zinc-100 hover:text-peligro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700"
                    >
                      Borrar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
