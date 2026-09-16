"use client";

import { useEffect, useState } from "react";
import { fmtCOP } from "@/lib/api-client";
import { crearGasto, eliminarGasto, listarGastos, type Gasto } from "@/features/cash/api";
import { toast } from "../../components/ui/ToastNotifications";
import { confirmDialog } from "../../components/ui/ConfirmDialog";
import { Badge, BtnPrimary, Card, EmptyState, Field, PageHeader, StatusMsg, inputCls } from "../../components/ui/SharedControls";

const CATEGORIAS = ["Arriendo", "Servicios", "Transporte", "Papelería", "Mantenimiento", "Otro"];

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [concepto, setConcepto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState("");
  const [msg, setMsg] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function load() {
    try {
      setGastos(await listarGastos());
    } catch (e: unknown) {
      setMsg(e instanceof Error ? `Error: ${e.message}` : "No se pudo cargar");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (guardando) return;
    setMsg("");
    setGuardando(true);
    try {
      await crearGasto({
        concepto: concepto.trim(),
        categoria: categoria.trim() || undefined,
        monto: Math.round(Number(monto) * 100),
        ...(fecha ? { fecha: new Date(`${fecha}T12:00:00`).toISOString() } : {}),
      });
      toast("Gasto registrado.");
      setConcepto("");
      setCategoria("");
      setMonto("");
      setFecha("");
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? `Error: ${e.message}` : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  async function repetir(g: Gasto) {
    try {
      await crearGasto({
        concepto: g.concepto,
        ...(g.categoria ? { categoria: g.categoria } : {}),
        monto: g.monto,
      });
      toast("Gasto repetido con fecha de hoy.");
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? `Error: ${e.message}` : "No se pudo repetir");
    }
  }

  async function borrar(g: Gasto) {
    const ok = await confirmDialog({
      titulo: "¿Borrar el gasto?",
      mensaje: `${g.concepto} · ${fmtCOP(g.monto)}. No se puede deshacer.`,
      confirmar: "Borrar",
      danger: true,
    });
    if (!ok) return;
    try {
      await eliminarGasto(g.id);
      toast("Gasto borrado.");
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? `Error: ${e.message}` : "No se pudo borrar");
    }
  }

  const total = gastos.reduce((acc, g) => acc + g.monto, 0);

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="Gastos del negocio"
        hint="La luz, el arriendo, el transporte. Salen de la caja y bajan la ganancia real."
      />

      <div className="lg:grid lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div className="space-y-4 lg:sticky lg:top-6">
          <Card>
            <p className="font-extrabold text-tinta">Registrar gasto</p>
            <p className="mb-3 text-xs text-zinc-500">Anotá el egreso para que cuadre la ganancia.</p>
            <form onSubmit={crear} className="space-y-3">
              <Field label="Concepto *" htmlFor="gasto-concepto">
                <input
                  id="gasto-concepto"
                  className={inputCls}
                  placeholder="Ej. Recibo de luz"
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  required
                  autoComplete="off"
                />
              </Field>
              <Field label="Categoría" htmlFor="gasto-categoria">
                <input
                  id="gasto-categoria"
                  className={inputCls}
                  list="categorias-gasto"
                  placeholder="Ej. Servicios"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  autoComplete="off"
                />
                <datalist id="categorias-gasto">
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Field label="Monto $ *" htmlFor="gasto-monto">
                    <input
                      id="gasto-monto"
                      className={inputCls}
                      inputMode="numeric"
                      placeholder="120000"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      required
                    />
                  </Field>
                </div>
                <div className="flex-1">
                  <Field label="Fecha" htmlFor="gasto-fecha">
                    <input
                      id="gasto-fecha"
                      type="date"
                      className={inputCls}
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                    />
                  </Field>
                </div>
              </div>
              <BtnPrimary type="submit" disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar gasto"}
              </BtnPrimary>
            </form>
          </Card>

          <StatusMsg msg={msg} />
        </div>

        <div className="mt-4 space-y-3 lg:mt-0">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-extrabold tracking-tight text-tinta">Últimos gastos</h2>
            {gastos.length > 0 && <Badge tone="neutral">Total {fmtCOP(total)}</Badge>}
          </div>
          {gastos.length === 0 ? (
            <EmptyState title="Sin gastos registrados" hint="Anotá el primero a la izquierda." />
          ) : (
            <ul className="space-y-2">
              {gastos.map((g) => (
                <li
                  key={g.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-zinc-200 bg-white p-4 shadow-card"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2">
                      <span className="truncate font-bold text-tinta">{g.concepto}</span>
                      {g.categoria && <Badge tone="neutral">{g.categoria}</Badge>}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(g.fecha).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                      {g.creadoPor ? ` · ${g.creadoPor.nombre}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold tabular-nums text-tinta">{fmtCOP(g.monto)}</span>
                    <button
                      type="button"
                      onClick={() => repetir(g)}
                      aria-label={`Repetir ${g.concepto}`}
                      title="Repetir con fecha de hoy"
                      className="press rounded-xl border border-tienda-700 bg-tienda-50 px-3 py-2 text-sm font-bold text-tienda-800 hover:bg-tienda-100"
                    >
                      Repetir
                    </button>
                    <button
                      type="button"
                      onClick={() => borrar(g)}
                      aria-label={`Borrar ${g.concepto}`}
                      className="press rounded-xl border border-red-200 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
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
