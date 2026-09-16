"use client";

import { useEffect, useState } from "react";
import { fmtCOP } from "@/lib/api-client";
import { fetchResumen, type Resumen } from "@/features/reporting/api";
import { fetchEstancados } from "@/features/catalog/api";
import type { Estancados } from "@/features/catalog/types";
import { Badge, Card, EmptyState, PageHeader, Skeleton, StatusMsg } from "../../components/ui/SharedControls";

const VENTANAS = [30, 60, 90];

export default function ReportesPage() {
  const [data, setData] = useState<Resumen | null>(null);
  const [est, setEst] = useState<Estancados | null>(null);
  const [diasEst, setDiasEst] = useState(30);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetchResumen()
      .then(setData)
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "No se pudo cargar"));
  }, []);

  useEffect(() => {
    fetchEstancados(diasEst)
      .then(setEst)
      .catch(() => {});
  }, [diasEst]);

  if (err) return <StatusMsg msg={`Error: ${err}`} />;
  if (!data)
    return (
      <div className="w-full space-y-4">
        <PageHeader title="Reportes" hint="Tus números claros, sin Excel." />
        <Skeleton className="h-36 rounded-card" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-card" />
          ))}
        </div>
      </div>
    );

  return (
    <div className="w-full space-y-4">
      <PageHeader title="Reportes" hint="Tus números claros, sin Excel." />

      <div className="lg:grid lg:grid-cols-3 lg:items-stretch lg:gap-4">
        {/* Métrica principal */}
        <Card className="border-tienda-100 bg-gradient-to-b from-tienda-50 to-white lg:col-span-2 lg:flex lg:flex-col lg:justify-center lg:p-8">
          <p className="text-xs font-bold uppercase tracking-wide text-tienda-800">Ganancia estimada</p>
          <p className="font-display text-4xl font-extrabold tabular-nums tracking-tight text-tinta md:text-5xl">
            {fmtCOP(data.gananciaEstimada)}
          </p>
          <p className="mt-2 text-sm text-zinc-600">Ventas menos costo. Para saber si vas ganando.</p>
        </Card>

        {/* Estado de stock */}
        <Card className="mt-4 flex flex-col justify-between lg:mt-0">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Poco stock</p>
            <p className="mt-1">
      <Card>
        <p className="font-extrabold text-tinta">Llevar al contador</p>
        <p className="mt-1 text-sm text-zinc-600">Descargá los datos en CSV (abre en Excel).</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/reportes/ventas.csv`}
            className="press block rounded-xl border border-zinc-300 bg-white p-3.5 text-center font-bold text-tinta hover:bg-zinc-100"
          >
            Ventas (CSV)
          </a>
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/reportes/inventario.csv`}
            className="press block rounded-xl border border-zinc-300 bg-white p-3.5 text-center font-bold text-tinta hover:bg-zinc-100"
          >
            Inventario (CSV)
          </a>
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/reportes/gastos.csv`}
            className="press block rounded-xl border border-zinc-300 bg-white p-3.5 text-center font-bold text-tinta hover:bg-zinc-100"
          >
            Gastos (CSV)
          </a>
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/reportes/caja.csv`}
            className="press block rounded-xl border border-zinc-300 bg-white p-3.5 text-center font-bold text-tinta hover:bg-zinc-100"
          >
            Caja (CSV)
          </a>
        </div>
      </Card>

      {data.bajoStock > 0 ? (
                <Badge tone="warn">{data.bajoStock} por pedir</Badge>
              ) : (
                <Badge tone="ok">Todo al día</Badge>
              )}
            </p>
          </div>
          <p className="mt-4 text-sm text-zinc-600">
            {data.bajoStock > 0
              ? "Revisá el inventario antes de que se acabe."
              : "Ningún producto bajo el mínimo. Buen trabajo."}
          </p>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="lift">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Inventario vale</p>
          <p className="text-2xl font-extrabold tabular-nums text-tinta">{fmtCOP(data.valorInventario)}</p>
        </Card>
        <Card className="lift">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Ventas totales</p>
          <p className="text-2xl font-extrabold tabular-nums text-tinta">{fmtCOP(data.totalVentas)}</p>
        </Card>
        <Card className="lift">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Productos</p>
          <p className="text-2xl font-extrabold tabular-nums text-tinta">{data.totalProductos}</p>
        </Card>
        <Card className="lift">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Margen por venta</p>
          <p className="text-2xl font-extrabold tabular-nums text-tinta">
            {data.totalVentas > 0 ? `${Math.round((data.gananciaEstimada / data.totalVentas) * 100)}%` : "—"}
          </p>
        </Card>
      </div>

      {est && est.items.length > 0 && (
        <section className="space-y-3" aria-label="Productos estancados">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl font-extrabold tracking-tight text-tinta">Plata quieta</h2>
            <div className="flex gap-1.5" role="group" aria-label="Ventana sin ventas">
              {VENTANAS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDiasEst(d)}
                  aria-pressed={diasEst === d}
                  className={`press rounded-full px-4 py-2 text-xs font-bold ${
                    diasEst === d
                      ? "bg-tienda-700 text-white shadow-pop"
                      : "border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  {d} días
                </button>
              ))}
            </div>
          </div>
          <Card className="border-amber-200 bg-amber-50/60">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Inmovilizado sin rotar</p>
            <p className="font-display text-3xl font-extrabold tabular-nums tracking-tight text-tinta">
              {fmtCOP(est.totalValor)}
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              {est.items.length} {est.items.length === 1 ? "producto" : "productos"} sin venderse en {est.dias}{" "}
              días. Bajales el precio o promocionalos para liberar esa plata.
            </p>
          </Card>
          <ul className="space-y-2">
            {est.items.slice(0, 8).map((it) => (
              <li
                key={it.id}
                className="flex items-center justify-between gap-3 rounded-card border border-zinc-200 bg-white p-3 shadow-card"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold text-tinta">{it.nombre}</p>
                  <p className="text-xs text-zinc-500 tabular-nums">
                    {it.stockActual} u. ·{" "}
                    {it.ultimaVenta
                      ? `últ. venta ${new Date(it.ultimaVenta).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}`
                      : "nunca se vendió"}
                  </p>
                </div>
                <span className="shrink-0 font-extrabold tabular-nums text-tinta">{fmtCOP(it.valor)}</span>
              </li>
            ))}
          </ul>
          {est.items.length > 8 && (
            <p className="text-center text-xs font-bold text-zinc-500">+{est.items.length - 8} más quietos</p>
          )}
        </section>
      )}

      {data.bajoStock > 0 ? (
        <a
          href="/productos"
          className="press block rounded-action border-2 border-amber-300 bg-amber-50 p-4 text-center font-extrabold text-amber-900 hover:bg-amber-100"
        >
          Pedir lo que falta
        </a>
      ) : (
        <EmptyState title="Todo al día" hint="Sin productos en bajo stock. Buen trabajo." />
      )}
    </div>
  );
}
