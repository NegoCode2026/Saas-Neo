"use client";

import { useCallback, useEffect, useState } from "react";
import { actualizarWhatsapp } from "@/features/business/api";
import { fetchRecordatorios } from "@/features/engagement/api";
import type { Recordatorio, RecordatoriosData } from "@/features/engagement/api";
import { toast } from "../../components/ui/ToastNotifications";
import { Badge, BtnPrimary, Card, EmptyState, Field, PageHeader, Skeleton, StatusMsg, inputCls } from "../../components/ui/SharedControls";

function waLink(telefono: string, texto: string): string {
  return `https://wa.me/${telefono.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;
}

const OPCIONES = [7, 15, 30];

export default function RecordatoriosPage() {
  const [data, setData] = useState<RecordatoriosData | null>(null);
  const [rango, setRango] = useState(7);
  const [textos, setTextos] = useState<Record<string, string>>({});
  const [whatsapp, setWhatsapp] = useState("");
  const [msg, setMsg] = useState("");
  const [guardando, setGuardando] = useState(false);

  const load = useCallback(async (r: number) => {
    try {
      const d = await fetchRecordatorios(r);
      setData(d);
      setWhatsapp(d.whatsapp ?? "");
      setTextos(Object.fromEntries(d.recordatorios.map((x) => [x.tipo, x.mensaje])));
    } catch (e: unknown) {
      setMsg(e instanceof Error ? `Error: ${e.message}` : "No se pudo cargar");
    }
  }, []);

  useEffect(() => {
    load(rango);
  }, [rango, load]);

  async function guardarWhatsApp(e: React.FormEvent) {
    e.preventDefault();
    if (guardando) return;
    setMsg("");
    setGuardando(true);
    try {
      await actualizarWhatsapp(whatsapp.trim() || null);
      toast("WhatsApp guardado.");
      load(rango);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? `Error: ${e.message}` : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  function enviar(r: Recordatorio) {
    const numero = data?.whatsapp;
    if (!numero) {
      setMsg("Error: guardá primero el WhatsApp del negocio.");
      return;
    }
    const texto = textos[r.tipo] || r.mensaje;
    window.open(waLink(numero, texto), "_blank", "noopener");
  }

  const numeroGuardado = data?.whatsapp ?? "";

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="Recordatorios por WhatsApp"
        hint="Un toque y se abre WhatsApp con el mensaje listo. No hace falta pegar nada."
      />

      <Card className={numeroGuardado ? "" : "border-amber-200 bg-amber-50/60"}>
        <form onSubmit={guardarWhatsApp} className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-extrabold text-tinta">WhatsApp del negocio</p>
              <p className="text-xs text-zinc-500">A este número se mandan los recordatorios.</p>
            </div>
            {numeroGuardado ? <Badge tone="ok">Configurado</Badge> : <Badge tone="warn">Falta</Badge>}
          </div>
          <Field label="Número (con indicativo)" htmlFor="rec-whatsapp">
            <input
              id="rec-whatsapp"
              className={inputCls}
              inputMode="tel"
              placeholder="Ej. 573001234567"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </Field>
          <BtnPrimary type="submit" disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar número"}
          </BtnPrimary>
        </form>
      </Card>

      <StatusMsg msg={msg} />

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Ventana de recordatorios">
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

      {!data ? (
        <Skeleton className="h-36 rounded-card" />
      ) : data.recordatorios.every((r) => r.cantidad === 0) ? (
        <EmptyState title="Todo al día" hint="Sin vencimientos ni bajo stock que recordar. Buen trabajo." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.recordatorios.map((r) => (
            <Card key={r.tipo} className="flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <p className="font-extrabold text-tinta">{r.titulo}</p>
                <Badge tone={r.cantidad === 0 ? "ok" : r.tipo === "VENCIMIENTOS" ? "warn" : "bad"}>
                  {r.cantidad}
                </Badge>
              </div>

              {r.items.length === 0 ? (
                <p className="mt-1 text-sm text-zinc-600">Nada pendiente.</p>
              ) : (
                <ul className="mt-2 space-y-0.5 text-sm text-zinc-600">
                  {r.items.slice(0, 6).map((it) => (
                    <li key={it.id} className="flex justify-between gap-2">
                      <span className="truncate">{it.nombre}</span>
                      <span className="whitespace-nowrap text-xs text-zinc-500">{it.detalle}</span>
                    </li>
                  ))}
                  {r.items.length > 6 && (
                    <li className="text-xs text-zinc-500">+{r.items.length - 6} más</li>
                  )}
                </ul>
              )}

              <label htmlFor={`rec-msg-${r.tipo}`} className="mt-3 block text-xs font-semibold text-zinc-500">
                Mensaje (podés editarlo)
              </label>
              <textarea
                id={`rec-msg-${r.tipo}`}
                rows={4}
                className={`${inputCls} mt-1 resize-y text-sm`}
                value={textos[r.tipo] ?? r.mensaje}
                onChange={(e) => setTextos((prev) => ({ ...prev, [r.tipo]: e.target.value }))}
              />

              <BtnPrimary onClick={() => enviar(r)} disabled={!numeroGuardado} className="mt-3 font-extrabold">
                Enviar por WhatsApp
              </BtnPrimary>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
