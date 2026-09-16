"use client";

import { useEffect, useState } from "react";
import { fmtCOP } from "@/lib/api-client";
import { abrirTurno, cerrarCaja, fetchCajaActual, fetchCajaHistorial, type CajaActual, type Cierre } from "@/features/cash/api";
import { toast } from "../../components/ui/ToastNotifications";
import { Badge, BtnPrimary, Card, EmptyState, Field, PageHeader, StatusMsg, inputCls } from "../../components/ui/SharedControls";

function tonoDiferencia(d: number): "ok" | "warn" | "bad" {
  if (d === 0) return "ok";
  return Math.abs(d) <= 200000 ? "warn" : "bad";
}

export default function CajaPage() {
  const [actual, setActual] = useState<CajaActual | null>(null);
  const [historial, setHistorial] = useState<Cierre[]>([]);
  const [contado, setContado] = useState("");
  const [notas, setNotas] = useState("");
  const [fondo, setFondo] = useState("");
  const [msg, setMsg] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [abriendo, setAbriendo] = useState(false);

  async function load() {
    try {
      const [a, h] = await Promise.all([fetchCajaActual(), fetchCajaHistorial()]);
      setActual(a);
      setHistorial(h);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? `Error: ${e.message}` : "No se pudo cargar");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function abrir(e: React.FormEvent) {
    e.preventDefault();
    if (abriendo) return;
    setMsg("");
    setAbriendo(true);
    try {
      await abrirTurno(Math.round(Number(fondo) * 100) || 0);
      toast("Turno abierto. A vender.");
      setFondo("");
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? `Error: ${e.message}` : "No se pudo abrir el turno");
    } finally {
      setAbriendo(false);
    }
  }

  async function cerrar(e: React.FormEvent) {
    e.preventDefault();
    if (guardando) return;
    setMsg("");
    setGuardando(true);
    try {
      await cerrarCaja(Math.round(Number(contado) * 100), notas.trim() || undefined);
      toast("Caja cerrada. Quedó guardado el arqueo.");
      setContado("");
      setNotas("");
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? `Error: ${e.message}` : "No se pudo cerrar la caja");
    } finally {
      setGuardando(false);
    }
  }

  const diferenciaPreview =
    actual && contado !== "" ? Math.round(Number(contado) * 100) - actual.esperado : null;

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="Caja y turnos"
        hint="Abrí tu turno, vendé, y cerrá cuadrando el efectivo."
      />

      <div className="lg:grid lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div className="space-y-4 lg:sticky lg:top-6">
          {actual?.turno ? (
            <Card className="border-tienda-100 bg-gradient-to-b from-tienda-50 to-white">
              <div className="flex items-center justify-between gap-2">
                <p className="font-extrabold text-tinta">Turno abierto</p>
                <Badge tone="ok">En curso</Badge>
              </div>
              <p className="mt-1 text-sm text-zinc-600">
                {actual.turno.abiertoPor?.nombre ?? "—"} · desde{" "}
                {new Date(actual.turno.abiertoAt).toLocaleString("es-CO", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {actual.turno.fondoInicial > 0 && <> · fondo {fmtCOP(actual.turno.fondoInicial)}</>}
              </p>
            </Card>
          ) : (
            <Card>
              <p className="font-extrabold text-tinta">Abrir turno</p>
              <p className="mb-3 text-xs text-zinc-500">Quién arranca y con cuánto fondo en caja.</p>
              <form onSubmit={abrir} className="space-y-3">
                <Field label="Fondo inicial $ (opcional)" htmlFor="turno-fondo">
                  <input
                    id="turno-fondo"
                    className={inputCls}
                    inputMode="numeric"
                    placeholder="Ej. 50000"
                    value={fondo}
                    onChange={(e) => setFondo(e.target.value)}
                  />
                </Field>
                <BtnPrimary type="submit" disabled={abriendo}>
                  {abriendo ? "Abriendo..." : "Abrir turno"}
                </BtnPrimary>
              </form>
            </Card>
          )}

          <Card className="border-tienda-100 bg-gradient-to-b from-tienda-50 to-white">
            <p className="text-xs font-bold uppercase tracking-wide text-tienda-800">Debería haber en caja</p>
            <p className="font-display text-4xl font-extrabold tabular-nums tracking-tight text-tinta">
              {actual ? fmtCOP(actual.esperado) : "—"}
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              {actual
                ? `${actual.cantidadVentas} ${actual.cantidadVentas === 1 ? "venta" : "ventas"} en efectivo desde ${new Date(
                    actual.desde
                  ).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                : "Cargando..."}
            </p>
            {actual && actual.porEmpleado.length > 0 && (
              <div className="mt-3 border-t border-tienda-100 pt-3">
                <p className="text-xs font-bold uppercase tracking-wide text-tienda-800">Por empleado</p>
                <ul className="mt-1 space-y-1">
                  {actual.porEmpleado.map((e) => (
                    <li key={e.id ?? e.nombre} className="flex justify-between gap-2 text-sm">
                      <span className="truncate text-zinc-700">
                        {e.nombre} · {e.ventas} {e.ventas === 1 ? "venta" : "ventas"}
                      </span>
                      <span className="shrink-0 font-extrabold tabular-nums text-tinta">{fmtCOP(e.total)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card>
            <p className="font-extrabold text-tinta">Cerrar caja</p>
            <p className="mb-3 text-xs text-zinc-500">
              {actual?.turno ? "Cierra el turno y guarda el arqueo." : "Contá el efectivo y registrá el arqueo."}
            </p>
            <form onSubmit={cerrar} className="space-y-3">
              <Field label="Efectivo contado $ *" htmlFor="caja-contado">
                <input
                  id="caja-contado"
                  className={inputCls}
                  inputMode="numeric"
                  placeholder="Ej. 450000"
                  value={contado}
                  onChange={(e) => setContado(e.target.value)}
                  required
                />
              </Field>
              <Field label="Notas" htmlFor="caja-notas" helper="Opcional: explicá una diferencia.">
                <input
                  id="caja-notas"
                  className={inputCls}
                  placeholder="Ej. Faltaron $500"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                />
              </Field>
              {diferenciaPreview !== null && (
                <p
                  className={`rounded-xl border p-3 text-sm font-bold ${
                    diferenciaPreview === 0
                      ? "border-tienda-100 bg-tienda-50 text-tienda-800"
                      : "border-amber-200 bg-amber-50 text-amber-900"
                  }`}
                >
                  {diferenciaPreview === 0
                    ? "Cuadra exacto."
                    : diferenciaPreview > 0
                    ? `Sobran ${fmtCOP(diferenciaPreview)}`
                    : `Faltan ${fmtCOP(Math.abs(diferenciaPreview))}`}
                </p>
              )}
              <BtnPrimary type="submit" disabled={guardando || contado === ""}>
                {guardando ? "Cerrando..." : "Cerrar caja"}
              </BtnPrimary>
            </form>
          </Card>

          <StatusMsg msg={msg} />
        </div>

        <div className="mt-4 space-y-3 lg:mt-0">
          <h2 className="font-display text-xl font-extrabold tracking-tight text-tinta">Últimos cierres</h2>
          {historial.length === 0 ? (
            <EmptyState title="Sin cierres todavía" hint="Cuando cierres la caja, acá queda el arqueo." />
          ) : (
            <ul className="space-y-2">
              {historial.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-zinc-200 bg-white p-4 shadow-card">
                  <div className="min-w-0">
                    <p className="font-bold text-tinta tabular-nums">
                      {new Date(c.createdAt).toLocaleString("es-CO", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {c.ventas} {c.ventas === 1 ? "venta" : "ventas"} · esperado {fmtCOP(c.esperado)} · contado{" "}
                      {fmtCOP(c.contado)}
                      {c.creadoPor ? ` · ${c.creadoPor.nombre}` : ""}
                    </p>
                    {c.turno && (
                      <p className="text-xs text-zinc-500">
                        Turno de {c.turno.abiertoPor?.nombre ?? "—"}
                        {c.turno.fondoInicial > 0 && <> · fondo {fmtCOP(c.turno.fondoInicial)}</>}
                      </p>
                    )}
                    {c.notas && <p className="mt-1 text-xs italic text-zinc-500">{c.notas}</p>}
                  </div>
                  <Badge tone={tonoDiferencia(c.diferencia)}>
                    {c.diferencia === 0
                      ? "Cuadró"
                      : c.diferencia > 0
                      ? `+${fmtCOP(c.diferencia)}`
                      : `-${fmtCOP(Math.abs(c.diferencia))}`}
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
