"use client";

import { useEffect, useState } from "react";
import { crearEmpleado, eliminarMiembro, listarEquipo } from "@/features/team/api";
import type { TeamMember } from "@/features/team/api";
import { Badge, BtnPrimary, Card, EmptyState, Field, PageHeader, StatusMsg, inputCls } from "../../../components/ui/SharedControls";
import { toast } from "../../../components/ui/ToastNotifications";
import { confirmDialog } from "../../../components/ui/ConfirmDialog";

export default function EquipoPage() {
  const [equipo, setEquipo] = useState<TeamMember[]>([]);
  const [form, setForm] = useState({ nombre: "", email: "", password: "" });
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      setEquipo(await listarEquipo());
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
      await crearEmpleado(form);
      setMsg("");
      toast("Empleado creado. Decile que entre con su email y clave.");
      setForm({ nombre: "", email: "", password: "" });
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? `Error: ${e.message}` : "No se pudo crear");
    }
  }

  async function borrar(id: string, nombre: string) {
    const ok = await confirmDialog({
      titulo: `¿Borrar a ${nombre}?`,
      mensaje: "Ya no podrá entrar al sistema.",
      confirmar: "Borrar",
      danger: true,
    });
    if (!ok) return;
    try {
      await eliminarMiembro(id);
      load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? `Error: ${e.message}` : "No se pudo borrar");
    }
  }

  return (
    <div className="w-full space-y-4">
      <PageHeader title="Equipo" hint="Solo el dueño crea y borra. Máximo 4 por negocio." />

      <div className="lg:grid lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div className="space-y-4 lg:sticky lg:top-6">
          <Card>
            <form onSubmit={crear} className="space-y-3">
              <Field label="Nombre del empleado" htmlFor="eq-nombre">
                <input
                  id="eq-nombre"
                  className={inputCls}
                  placeholder="Ej. María"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  required
                  autoComplete="off"
                />
              </Field>
              <Field label="Email para entrar" htmlFor="eq-email">
                <input
                  id="eq-email"
                  className={inputCls}
                  type="email"
                  placeholder="maria@tienda.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  autoComplete="off"
                />
              </Field>
              <Field label="Clave inicial" htmlFor="eq-pass" helper="Mínimo 6 caracteres. Después la puede cambiar.">
                <input
                  id="eq-pass"
                  className={inputCls}
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </Field>
              <BtnPrimary type="submit">Agregar empleado</BtnPrimary>
            </form>
          </Card>
          <StatusMsg msg={msg} />
        </div>

        <div className="mt-4 space-y-3 lg:mt-0">
          {equipo.length === 0 ? (
            <EmptyState title="Solo estás vos por ahora" hint="Agregá a tu primer empleado a la izquierda." />
          ) : (
            <ul className="grid gap-2 md:grid-cols-2">
              {equipo.map((u) => (
                <li
                  key={u.id}
                  className="lift flex items-center justify-between gap-3 rounded-card border border-zinc-200 bg-white p-4 shadow-card"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tienda-50 text-sm font-extrabold text-tienda-800"
                    >
                      {u.nombre.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-tinta">{u.nombre}</p>
                      <p className="truncate text-xs text-zinc-600">{u.email}</p>
                    </div>
                  </div>
                  {u.rol === "DUENO" ? (
                    <Badge tone="ok">Dueño</Badge>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Borrar a ${u.nombre}`}
                      onClick={() => borrar(u.id, u.nombre)}
                      className="press shrink-0 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-peligro hover:bg-red-50 active:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peligro"
                    >
                      Borrar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
