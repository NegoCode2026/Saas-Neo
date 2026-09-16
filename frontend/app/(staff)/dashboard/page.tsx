"use client";

import { useEffect, useState } from "react";
import { fmtCOP } from "@/lib/api-client";
import { fetchResumen, type Resumen } from "@/features/reporting/api";
import { fetchAlertas, listarProductos } from "@/features/catalog/api";
import type { Alerta, Producto } from "@/features/catalog/types";
import { fetchCajaActual, type CajaActual } from "@/features/cash/api";
import { Badge, Card, EmptyState, Skeleton } from "../../components/ui/SharedControls";
import InstallAppButton from "../../components/pwa/InstallAppButton";
import GettingStartedChecklist from "../../components/onboarding/GettingStartedChecklist";

function KpiIcon({ tone, children }: { tone: "blue" | "green"; children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-10 w-10 items-center justify-center rounded-full ${
        tone === "blue" ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"
      }`}
    >
      {children}
    </span>
  );
}

function estadoDe(p: Producto): { label: string; tone: "ok" | "warn" | "bad" } {
  if (p.stockActual <= 0) return { label: "Crítico", tone: "bad" };
  if (p.stockActual <= p.stockMinimo) return { label: "Bajo", tone: "warn" };
  return { label: "En Stock", tone: "ok" };
}

/* Dashboard — lectura STOCKNIX: KPIs con icono + tabla de recientes.
   Dials operate: varianza 5, motion 3, densidad 5.
   Desktop: 3 KPIs + tabla real. Móvil: KPIs apilados + lista de cards.
   Acción primaria única: Vender ahora. */
export default function Dashboard() {
  const [data, setData] = useState<Resumen | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [caja, setCaja] = useState<CajaActual | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchResumen(),
      listarProductos(),
      fetchAlertas().catch(() => [] as Alerta[]),
      fetchCajaActual().catch(() => null),
    ])
      .then(([r, ps, as, c]) => {
        setData(r);
        setProductos(ps.items.slice(0, 6));
        setAlertas(as.slice(0, 5));
        setCaja(c);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const kpis = data
    ? [
        { label: "Total Productos", value: String(data.totalProductos), icon: "box" },
        { label: "Valor Inventario", value: fmtCOP(data.valorInventario), icon: "coin" },
        { label: "Ventas Mes", value: fmtCOP(data.totalVentas), icon: "trend" },
      ]
    : [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 py-2">
        <header>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-tinta md:text-4xl">
            Dashboard de Inventario
          </h1>
          <p className="mt-1 text-sm text-zinc-500 md:text-base">
            Resumen general de tu sistema de inventarios
          </p>
        </header>

        {!loading && (
          <>
            <GettingStartedChecklist tieneProductos={(data?.totalProductos ?? 0) > 0} tieneVentas={(data?.totalVentas ?? 0) > 0} />
            <InstallAppButton />
          </>
        )}

        {/* Acciones rápidas: una primaria, dos secundarias */}
        <div className="grid gap-2 sm:grid-cols-3">
          <a
            href="/vender"
            className="press rounded-action bg-tienda-700 px-5 py-4 font-extrabold text-white shadow-pop hover:bg-tienda-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700 focus-visible:ring-offset-2"
          >
            Vender ahora
            <span className="block text-xs font-medium text-white/80">Buscá, tocá +, cobrá</span>
          </a>
          <a
            href="/productos#registro"
            className="press rounded-action border border-zinc-300 bg-white px-5 py-4 font-extrabold text-tinta hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700 focus-visible:ring-offset-2"
          >
            Agregar
            <span className="block text-xs font-medium text-zinc-500">Producto en 30 seg</span>
          </a>
          <a
            href="/movimientos"
            className="press rounded-action border border-zinc-300 bg-white px-5 py-4 font-extrabold text-tinta hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700 focus-visible:ring-offset-2"
          >
            Entrada
            <span className="block text-xs font-medium text-zinc-500">Compra o ajuste</span>
          </a>
        </div>

        {/* Caja rápida: esperado visible y atajo a cerrar */}
        {!loading && caja && (
          <Card className="flex flex-wrap items-center justify-between gap-3 border-tienda-100 bg-gradient-to-r from-tienda-50 to-white">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-tienda-800">
                En caja{caja.turno ? ` · turno de ${caja.turno.abiertoPor?.nombre ?? "—"}` : ""}
              </p>
              <p className="font-display text-2xl font-extrabold tabular-nums tracking-tight text-tinta">
                {fmtCOP(caja.esperado)}
              </p>
              <p className="text-xs text-zinc-500">
                {caja.cantidadVentas} {caja.cantidadVentas === 1 ? "venta" : "ventas"} en efectivo
              </p>
            </div>
            <a
              href="/caja"
              className="press rounded-full bg-tienda-700 px-5 py-3 text-sm font-extrabold text-white shadow-pop hover:bg-tienda-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700 focus-visible:ring-offset-2"
            >
              Cerrar caja
            </a>
          </Card>
        )}

        {/* KPIs */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 rounded-card" />
            ))}
          </div>
        ) : data ? (
          <dl className="grid gap-4 md:grid-cols-3">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-card border border-zinc-200 bg-white p-5 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <dt className="text-sm font-medium text-zinc-500">{k.label}</dt>
                  <dd aria-hidden="true">
                    {k.icon === "box" && (
                      <KpiIcon tone="blue">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2.5 21 7v10l-9 4.5L3 17V7zM3 7l9 4.5L21 7M12 11.5V21.5" />
                        </svg>
                      </KpiIcon>
                    )}
                    {k.icon === "coin" && (
                      <KpiIcon tone="green">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="8.5" />
                          <path d="M12 7.5v9M9.5 9.5c0-1 1.1-1.7 2.5-1.7s2.5.7 2.5 1.7-1 1.5-2.5 1.9-2.5.9-2.5 1.9 1.1 1.7 2.5 1.7 2.5-.7 2.5-1.7" />
                        </svg>
                      </KpiIcon>
                    )}
                    {k.icon === "trend" && (
                      <KpiIcon tone="green">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />
                        </svg>
                      </KpiIcon>
                    )}
                  </dd>
                </div>
                <dd className="mt-1 font-display text-3xl font-extrabold tabular-nums tracking-tight text-tinta">
                  {k.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-zinc-600">No se pudo cargar. Revisá tu conexión.</p>
        )}

        {/* Productos recientes */}
        <Card className="!p-0 overflow-hidden md:!p-0">
          <div className="p-5 pb-3 md:p-6 md:pb-4">
            <h2 className="font-display text-xl font-extrabold tracking-tight text-tinta">
              Productos Recientes
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Últimos productos agregados y sus estados de stock
            </p>
          </div>

          {loading ? (
            <div className="space-y-2 p-5 pt-0">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : productos.length === 0 ? (
            <div className="p-5 pt-0">
              <EmptyState
                title="Todavía no hay productos"
                hint="Agregá el primero en 30 segundos."
                action={
                  <a
                    href="/productos#registro"
                    className="press mt-2 inline-block rounded-full bg-tienda-700 px-5 py-3 text-sm font-extrabold text-white"
                  >
                    Agregar producto
                  </a>
                }
              />
            </div>
          ) : (
            <>
              {/* Desktop: tabla */}
              <table className="hidden w-full text-left text-sm md:table">
                <thead>
                  <tr className="border-y border-zinc-100 bg-zinc-50/70 text-zinc-500">
                    <th scope="col" className="px-6 py-3 font-semibold">Producto</th>
                    <th scope="col" className="px-6 py-3 font-semibold">Stock</th>
                    <th scope="col" className="px-6 py-3 font-semibold">Estado</th>
                    <th scope="col" className="px-6 py-3 text-right font-semibold">Precio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {productos.map((p) => {
                    const e = estadoDe(p);
                    return (
                      <tr key={p.id} className="transition-colors hover:bg-zinc-50/70">
                        <td className="px-6 py-3.5 font-semibold text-tinta">{p.nombre}</td>
                        <td className="px-6 py-3.5 text-zinc-600 tabular-nums">
                          {p.stockActual} {p.stockActual === 1 ? "unidad" : "unidades"}
                        </td>
                        <td className="px-6 py-3.5">
                          <Badge tone={e.tone}>{e.label}</Badge>
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold tabular-nums text-tinta">
                          {fmtCOP(p.precioVenta)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {/* Móvil: lista de cards */}
              <ul className="space-y-2 px-4 pb-4 md:hidden">
                {productos.map((p) => {
                  const e = estadoDe(p);
                  return (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/60 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-bold text-tinta">{p.nombre}</p>
                        <p className="text-xs text-zinc-500 tabular-nums">
                          {p.stockActual} {p.stockActual === 1 ? "unidad" : "unidades"} · {fmtCOP(p.precioVenta)}
                        </p>
                      </div>
                      <Badge tone={e.tone}>{e.label}</Badge>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card>

        {/* Alerta de poco stock */}
        {!loading && alertas.length > 0 && (
          <div className="rounded-card border border-amber-200 bg-amber-50 p-4 md:p-5">
            <p className="flex items-center gap-2 font-extrabold text-amber-900">
              <span aria-hidden="true" className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-amber-500" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-600" />
              </span>
              {alertas.length} con poco stock — pedilos hoy
            </p>
            <ul className="mt-2 space-y-1">
              {alertas.map((a) => (
                <li key={a.id} className="flex justify-between gap-2 text-sm text-amber-900">
                  <span className="truncate font-medium">{a.nombre}</span>
                  <span className="whitespace-nowrap font-bold tabular-nums">quedan {a.stockActual}</span>
                </li>
              ))}
            </ul>
            <a
              href="/productos"
              className="press mt-3 block rounded-xl border border-amber-300 bg-white p-3 text-center text-sm font-extrabold text-amber-900 hover:bg-amber-100"
            >
              Revisar productos
            </a>
          </div>
        )}

        {/* Últimas ventas + negocio */}
        <div className="grid gap-4 lg:grid-cols-2">
          {!loading && data && data.ultimasVentas.length > 0 && (
            <Card>
              <div className="flex items-center justify-between gap-2">
                <p className="font-extrabold text-tinta">Últimas ventas</p>
                <Badge tone="neutral">{data.ultimasVentas.length} recientes</Badge>
              </div>
              <ul className="mt-2 space-y-1.5">
                {data.ultimasVentas.slice(0, 5).map((v) => (
                  <li key={v.id} className="flex justify-between gap-2 text-sm">
                    <span className="text-zinc-600">
                      {new Date(v.createdAt).toLocaleString("es-CO", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" · "}
                      {v.items.reduce((n, it) => n + it.cantidad, 0)} items
                    </span>
                    <span className="font-extrabold tabular-nums text-tinta">{fmtCOP(v.total)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card className="flex items-center justify-between gap-3">
            <div>
              <p className="font-extrabold text-tinta">Tu negocio</p>
              <p className="text-xs text-zinc-500">Equipo y proveedores</p>
            </div>
            <div className="flex shrink-0 gap-2 text-sm font-bold">
              <a href="/equipo" className="press rounded-full border border-zinc-300 px-4 py-2.5 hover:bg-zinc-100">
                Equipo
              </a>
              <a href="/proveedores" className="press rounded-full border border-zinc-300 px-4 py-2.5 hover:bg-zinc-100">
                Proveedores
              </a>
            </div>
          </Card>
        </div>
    </div>
  );
}
