"use client";

import { useEffect, useState } from "react";
import { fmtCOP } from "@/lib/api-client";
import { aplicarConteo } from "@/features/inventory/api";
import type { ConteoItemInput, ResumenConteo } from "@/features/inventory/api";
import { listarProductos } from "@/features/catalog/api";
import { toast } from "../../components/ui/ToastNotifications";
import { confirmDialog } from "../../components/ui/ConfirmDialog";
import { Badge, BtnPrimary, BtnSecondary, Card, EmptyState, PageHeader, StatusMsg, inputCls } from "../../components/ui/SharedControls";

type Prod = {
  id: string;
  nombre: string;
  categoria?: string | null;
  stockActual: number;
  precioCompra: number;
};

/* Conteo físico: contás lo que hay en el estante y confirmás.
   Solo lo que difiere genera un AJUSTE firmado en el historial.
   Vacío = no contado (no se toca). */
export default function ConteoPage() {
  const [productos, setProductos] = useState<Prod[]>([]);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [msg, setMsg] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [resumen, setResumen] = useState<ResumenConteo | null>(null);

  const PAGE = 50;

  function mostrado(p: Prod): string {
    return vals[p.id] ?? String(p.stockActual);
  }

  function modificado(p: Prod): boolean {
    const v = vals[p.id];
    if (v === undefined || v === "") return false;
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 && n !== p.stockActual;
  }

  async function load(q = "", append = false) {
    try {
      const offset = append ? productos.length : 0;
      const { items, total: t } = await listarProductos({ search: q, limit: PAGE, offset });
      setProductos((prev) => (append ? [...prev, ...items] : items));
      setTotal(t);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? `Error: ${e.message}` : "No se pudo cargar");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarMas() {
    setCargandoMas(true);
    await load(search, true);
    setCargandoMas(false);
  }

  function step(p: Prod, delta: number) {
    const actual = Math.max(0, Number(mostrado(p)) || 0);
    setVals((prev) => ({ ...prev, [p.id]: String(Math.max(0, actual + delta)) }));
  }

  const conDiferencia = productos.filter(modificado);

  async function confirmar() {
    if (confirmando || conDiferencia.length === 0) return;
    const ok = await confirmDialog({
      titulo: "¿Aplicar el conteo?",
      mensaje: `Se ajustan ${conDiferencia.length} ${conDiferencia.length === 1 ? "producto" : "productos"}. Queda firmado en Historial.`,
      confirmar: "Aplicar",
    });
    if (!ok) return;
    setMsg("");
    setConfirmando(true);
    try {
      const items: ConteoItemInput[] = conDiferencia.map((p) => ({ productoId: p.id, contado: Number(vals[p.id]) }));
      const r = await aplicarConteo(items);
      setResumen(r);
      setVals({});
      setProductos([]);
      await load(search);
      toast(`Conteo aplicado: ${r.ajustados} ajustes.`);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? `Error: ${e.message}` : "No se pudo aplicar");
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="Conteo físico"
        hint="Contá lo que hay en el estante. Solo las diferencias generan un ajuste firmado."
      />

      {resumen && (
        <section aria-label="Resultado del conteo" className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="border-red-200 bg-red-50/60">
              <p className="text-xs font-bold uppercase tracking-wide text-red-700">Faltan</p>
              <p className="font-display text-3xl font-extrabold tabular-nums text-tinta">
                {resumen.faltantesUnidades} u.
              </p>
              <p className="text-sm font-bold tabular-nums text-red-700">{fmtCOP(resumen.faltantesValor)}</p>
            </Card>
            <Card className="border-tienda-100 bg-tienda-50">
              <p className="text-xs font-bold uppercase tracking-wide text-tienda-800">Sobran</p>
              <p className="font-display text-3xl font-extrabold tabular-nums text-tinta">
                {resumen.sobrantesUnidades} u.
              </p>
              <p className="text-sm font-bold tabular-nums text-tienda-800">{fmtCOP(resumen.sobrantesValor)}</p>
            </Card>
          </div>
          {resumen.items.length > 0 && (
            <ul className="space-y-2">
              {resumen.items.map((it) => (
                <li
                  key={it.productoId}
                  className="flex items-center justify-between gap-3 rounded-card border border-zinc-200 bg-white p-3 shadow-card"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-tinta">{it.nombre}</p>
                    <p className="text-xs text-zinc-500 tabular-nums">
                      sistema {it.antes} → contado {it.contado}
                    </p>
                  </div>
                  <Badge tone={it.diferencia < 0 ? "bad" : "ok"}>
                    {it.diferencia < 0 ? `faltan ${-it.diferencia}` : `sobran ${it.diferencia}`}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <BtnSecondary onClick={() => setResumen(null)}>
            Seguir contando
          </BtnSecondary>
        </section>
      )}

      <div className="lg:grid lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div className="space-y-4 lg:sticky lg:top-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              load(search);
            }}
            className="flex gap-2"
            role="search"
          >
            <label htmlFor="conteo-search" className="sr-only">
              Buscar producto para contar
            </label>
            <input
              id="conteo-search"
              placeholder="Buscar para contar..."
              className="flex-1 rounded-xl border border-zinc-300 bg-white p-3.5 text-base placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
            />
            <button
              type="submit"
              className="press rounded-xl border border-zinc-300 bg-white px-5 font-bold hover:bg-zinc-100 active:bg-zinc-200"
            >
              Buscar
            </button>
          </form>

          <Card>
            <p className="font-extrabold text-tinta">Aplicar conteo</p>
            <p className="mb-3 text-xs text-zinc-500">
              {conDiferencia.length === 0
                ? "Todavía no hay diferencias. Contá arriba."
                : `${conDiferencia.length} ${conDiferencia.length === 1 ? "producto" : "productos"} con diferencia.`}
            </p>
            <BtnPrimary onClick={confirmar} disabled={confirmando || conDiferencia.length === 0}>
              {confirmando ? "Aplicando..." : `Confirmar conteo (${conDiferencia.length})`}
            </BtnPrimary>
            <p className="mt-2 text-xs text-zinc-500">
              Queda firmado en Historial con tu nombre. Lo que dejes vacío no se toca.
            </p>
          </Card>

          <StatusMsg msg={msg} />
        </div>

        <div className="mt-4 space-y-3 lg:mt-0">
          {productos.length === 0 ? (
            <EmptyState title="Sin productos" hint="Buscá arriba o agregá productos primero." />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {productos.map((p) => {
                const mod = modificado(p);
                return (
                  <li
                    key={p.id}
                    className={`space-y-2 rounded-card border bg-white p-4 shadow-card ${
                      mod ? "border-tienda-700" : "border-zinc-200"
                    }`}
                  >
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2">
                          <span className="truncate font-bold text-tinta">{p.nombre}</span>
                          {mod && <Badge tone="warn">Difiere</Badge>}
                        </p>
                        <p className="mt-0.5 text-sm text-zinc-600 tabular-nums">En sistema: {p.stockActual}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Quitar una unidad a ${p.nombre}`}
                        onClick={() => step(p, -1)}
                        className="press h-12 w-12 shrink-0 rounded-xl border border-zinc-300 text-xl font-extrabold hover:bg-zinc-100"
                      >
                        −
                      </button>
                      <label htmlFor={`conteo-${p.id}`} className="sr-only">
                        Contado de {p.nombre}
                      </label>
                      <input
                        id={`conteo-${p.id}`}
                        className={`${inputCls} text-center text-lg font-extrabold tabular-nums`}
                        inputMode="numeric"
                        value={mostrado(p)}
                        onChange={(e) => setVals((prev) => ({ ...prev, [p.id]: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                      />
                      <button
                        type="button"
                        aria-label={`Sumar una unidad a ${p.nombre}`}
                        onClick={() => step(p, 1)}
                        className="press h-12 w-12 shrink-0 rounded-xl border border-zinc-300 text-xl font-extrabold hover:bg-zinc-100"
                      >
                        +
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {productos.length < total && (
            <BtnSecondary onClick={cargarMas} disabled={cargandoMas} className="font-bold">
              {cargandoMas ? "Cargando..." : `Cargar más (${productos.length} de ${total})`}
            </BtnSecondary>
          )}
        </div>
      </div>
    </div>
  );
}
