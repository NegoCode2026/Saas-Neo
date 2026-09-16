"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchVencimientos } from "@/features/catalog/api";
import type { Vencimientos } from "@/features/catalog/types";
import { Badge, Card, EmptyState, PageHeader, Skeleton, StatusMsg } from "../../components/ui/SharedControls";

function dias(fecha: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const f = new Date(fecha);
  f.setHours(0, 0, 0, 0);
  return Math.round((f.getTime() - hoy.getTime()) / 86400000);
}

function etiqueta(fecha: string): string {
  const d = dias(fecha);
  if (d === 0) return "Vence hoy";
  if (d === 1) return "Vence mañana";
  if (d < 0) return `Vencido hace ${Math.abs(d)} ${Math.abs(d) === 1 ? "día" : "días"}`;
  return `Vence en ${d} días`;
}

const OPCIONES = [7, 15, 30];

export default function VencimientosPage() {
  const [data, setData] = useState<Vencimientos | null>(null);
  const [rango, setRango] = useState(7);
  const [err, setErr] = useState("");

  const load = useCallback(async (r: number) => {
    try {
      setErr("");
      setData(await fetchVencimientos(r));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "No se pudo cargar");
    }
  }, []);

  useEffect(() => {
    load(rango);
  }, [rango, load]);

  const total = (data?.vencidos.length ?? 0) + (data?.proximos.length ?? 0);

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="Vencimientos"
        hint="Lo que está por vencer o ya venció. Sácalo antes de perder plata."
        action={
          <a
            href="/recordatorios"
            className="press shrink-0 rounded-full border border-tienda-700 bg-tienda-50 px-4 py-2.5 text-sm font-bold text-tienda-800 hover:bg-tienda-100"
          >
            Recordar por WhatsApp
          </a>
        }
      />

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Ventana de vencimiento">
        {OPCIONES.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setRango(d)}
            aria-pressed={rango === d}
            className={`press rounded-full px-4 py-2.5 text-sm font-bold ${
              rango === d
                ? "bg-tienda-700 text-white shadow-pop"
                : "border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            Próximos {d} días
          </button>
        ))}
      </div>

      {err ? (
        <StatusMsg msg={`Error: ${err}`} />
      ) : !data ? (
        <Skeleton className="h-36 rounded-card" />
      ) : total === 0 ? (
        <EmptyState
          title="Nada por vencer"
          hint={`Sin vencimientos en los próximos ${rango} días. Vas bien.`}
          action={
            <a
              href="/productos#registro"
              className="press mt-2 inline-block rounded-full bg-tienda-700 px-5 py-3 text-sm font-extrabold text-white"
            >
              Cargar vencimientos a un producto
            </a>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-extrabold tracking-tight text-tinta">Vencidos</h2>
              <Badge tone="bad">{data.vencidos.length}</Badge>
            </div>
            {data.vencidos.length === 0 ? (
              <p className="rounded-card border border-dashed border-zinc-300 bg-white/60 p-4 text-sm text-zinc-600">
                Ninguno vencido.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.vencidos.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-card border border-red-200 bg-red-50/60 p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold text-tinta">{p.nombre}</p>
                      <p className="text-xs font-semibold text-red-700">{etiqueta(p.fechaVencimiento)}</p>
                    </div>
                    <span className="whitespace-nowrap text-sm text-zinc-600 tabular-nums">{p.stockActual} u.</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-extrabold tracking-tight text-tinta">Por vencer</h2>
              <Badge tone="warn">{data.proximos.length}</Badge>
            </div>
            {data.proximos.length === 0 ? (
              <p className="rounded-card border border-dashed border-zinc-300 bg-white/60 p-4 text-sm text-zinc-600">
                Nada en los próximos {rango} días.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.proximos.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-card border border-amber-200 bg-amber-50/60 p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold text-tinta">{p.nombre}</p>
                      <p className="text-xs font-semibold text-amber-800">{etiqueta(p.fechaVencimiento)}</p>
                    </div>
                    <span className="whitespace-nowrap text-sm text-zinc-600 tabular-nums">{p.stockActual} u.</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <Card>
        <p className="font-extrabold text-tinta">¿Cómo se calculan?</p>
        <p className="mt-1 text-sm text-zinc-600">
          La fecha se guarda por producto en su ficha. Si un producto tiene lote nuevo, actualizá la fecha.
        </p>
      </Card>
    </div>
  );
}
