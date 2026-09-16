"use client";

import { useEffect, useState } from "react";
import { crearMovimiento, fetchMovimientos } from "@/features/inventory/api";
import type { Movimiento } from "@/features/inventory/api";
import { listarProductos } from "@/features/catalog/api";
import { Badge, BtnPrimary, Card, EmptyState, Field, PageHeader, StatusMsg, inputCls } from "../../components/ui/SharedControls";
import { toast } from "../../components/ui/ToastNotifications";

type Producto = { id: string; nombre: string; stockActual: number };

const TIPOS = [
  { v: "ENTRADA", label: "Entrada", hint: "Compra" },
  { v: "SALIDA", label: "Salida", hint: "Pérdida" },
  { v: "AJUSTE", label: "Ajuste", hint: "Conteo" },
] as const;

export default function MovimientosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [movs, setMovs] = useState<Movimiento[]>([]);
  const [form, setForm] = useState({ productoId: "", tipo: "ENTRADA", cantidad: "1", motivo: "" });
  const [msg, setMsg] = useState("");
  const esAjuste = form.tipo === "AJUSTE";
  const stockSistema = productos.find((p) => p.id === form.productoId)?.stockActual;

  async function load() {
    try {
      const [ps, ms] = await Promise.all([listarProductos(), fetchMovimientos()]);
      setProductos(ps.items);
      setMovs(ms);
      if (!form.productoId && ps.items.length > 0) setForm((f) => ({ ...f, productoId: ps.items[0].id }));
    } catch (e: unknown) {
      setMsg(e instanceof Error ? `Error: ${e.message}` : "No se pudo cargar");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Guardando...");
    try {
      await crearMovimiento({
        productoId: form.productoId,
        tipo: form.tipo,
        cantidad: Number(form.cantidad),
        motivo: form.motivo || undefined,
      });
      setMsg("");
      toast("Movimiento registrado.");
      setForm({ ...form, cantidad: "1", motivo: "" });
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? `Error: ${e.message}` : "No se pudo guardar");
    }
  }

  return (
    <div className="w-full space-y-4">
      <PageHeader title="Movimientos" hint="Entradas y salidas mueven unidades. En ajuste escribí lo que contaste: el sistema corrige solo." />

      <div className="lg:grid lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div className="space-y-4 lg:sticky lg:top-6">
          <Card>
            <form onSubmit={registrar} className="space-y-3">
              <Field label="Producto" htmlFor="mov-prod">
                <select
                  id="mov-prod"
                  className={inputCls}
                  value={form.productoId}
                  onChange={(e) => setForm({ ...form, productoId: e.target.value })}
                  required
                >
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (hay {p.stockActual})
                    </option>
                  ))}
                </select>
              </Field>
              <fieldset>
                <legend className="mb-1 block text-sm font-semibold text-tinta">Tipo</legend>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo de movimiento">
                  {TIPOS.map((t) => {
                    const active = form.tipo === t.v;
                    return (
                      <button
                        key={t.v}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setForm({ ...form, tipo: t.v })}
                        className={`press rounded-2xl border-2 p-3 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700 ${
                          active
                            ? "border-tienda-700 bg-tienda-50 text-tienda-900"
                            : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                        }`}
                      >
                        <span className="block font-extrabold">{t.label}</span>
                        <span className="block text-[11px] font-medium">{t.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div className="flex gap-2">
                <div className="w-24">
                  <Field
                    label={esAjuste ? "Contó" : "Cantidad"}
                    htmlFor="mov-cant"
                    helper={esAjuste && stockSistema !== undefined ? `En sistema: ${stockSistema}` : undefined}
                  >
                    <input
                      id="mov-cant"
                      className={inputCls}
                      inputMode="numeric"
                      value={form.cantidad}
                      onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                      required
                    />
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label="Motivo (opcional)" htmlFor="mov-motivo">
                    <input
                      id="mov-motivo"
                      className={inputCls}
                      placeholder={esAjuste ? "Ej. se vencieron 2..." : "Compra a Don Pedro..."}
                      value={form.motivo}
                      onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
              <BtnPrimary type="submit">Registrar</BtnPrimary>
            </form>
          </Card>
          <StatusMsg msg={msg} />
        </div>

        <div className="mt-4 space-y-3 lg:mt-0">
          {movs.length === 0 ? (
            <EmptyState title="Sin movimientos todavía" hint="Registrá la primera entrada a la izquierda." />
          ) : (
            <ul className="grid gap-2 md:grid-cols-2">
              {movs.slice(0, 40).map((m) => (
                <li
                  key={m.id}
                  className="lift flex justify-between gap-3 rounded-card border border-zinc-200 bg-white p-4 shadow-card"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-tinta">{m.producto.nombre}</p>
                <p className="truncate text-xs text-zinc-500">
                  {m.motivo ?? "Sin motivo"} · {new Date(m.createdAt).toLocaleString("es-CO")}
                  {m.creadoPor ? ` · por ${m.creadoPor.nombre}` : ""}
                </p>
                  </div>
                  <Badge tone={m.tipo === "ENTRADA" ? "ok" : m.tipo === "SALIDA" ? "bad" : "neutral"}>
                    {m.tipo === "ENTRADA" ? "+" : m.tipo === "SALIDA" ? "−" : "="}
                    {m.cantidad}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
