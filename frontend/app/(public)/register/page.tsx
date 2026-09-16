"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "@/features/auth/api";
import { BtnPrimary, Field, inputCls } from "../../components/ui/SharedControls";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ negocio: "", nombre: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setErr("");
    setLoading(true);
    try {
      await register(form);
      router.push("/dashboard");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "No se pudo crear. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bleed -mb-32 -mt-4">
      <div className="auth-bg grid min-h-[92dvh] place-items-center px-4 pb-40 pt-10">
        <div className="rise w-full max-w-md">
          <a
            href="/"
            className="mb-4 inline-block rounded-full px-3 py-2.5 text-sm font-bold text-zinc-600 hover:bg-white/70 hover:text-tinta"
          >
            ← Volver al inicio
          </a>
          <div className="rounded-[2rem] border border-zinc-200/80 bg-white/70 p-2 shadow-card">
            <div className="rounded-[calc(2rem-0.5rem)] border border-zinc-200 bg-white p-6 shadow-card md:p-8">
              <p className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-tienda-700 font-display text-xl font-extrabold text-white shadow-pop"
                >
                  S
                </span>
                <span className="font-display text-2xl font-extrabold tracking-tight text-tinta">StockLocal</span>
              </p>
              <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-tinta">
                Creá tu negocio
              </h1>
              <p className="mt-1 text-sm text-zinc-600">En 1 minuto estás vendiendo. Sin tarjeta.</p>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <Field label="Nombre del negocio *" htmlFor="reg-negocio">
                  <input
                    id="reg-negocio"
                    className={inputCls}
                    placeholder="Ej. Tienda Doña Luz"
                    value={form.negocio}
                    onChange={(e) => setForm({ ...form, negocio: e.target.value })}
                    required
                    autoComplete="organization"
                  />
                </Field>
                <Field label="Tu nombre *" htmlFor="reg-nombre">
                  <input
                    id="reg-nombre"
                    className={inputCls}
                    placeholder="Ej. Carlos"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    required
                    autoComplete="given-name"
                  />
                </Field>
                <Field label="Email *" htmlFor="reg-email">
                  <input
                    id="reg-email"
                    className={inputCls}
                    type="email"
                    placeholder="vos@tutienta.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    autoComplete="email"
                  />
                </Field>
                <Field label="Creá una clave *" htmlFor="reg-pass" helper="Mínimo 6 caracteres.">
                  <input
                    id="reg-pass"
                    className={inputCls}
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </Field>
                {err && (
                  <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-peligro">
                    {err}
                  </p>
                )}
                <BtnPrimary type="submit" disabled={loading}>
                  {loading ? "Creando..." : "Crear y entrar"}
                </BtnPrimary>
              </form>

              <p className="mt-5 border-t border-zinc-100 pt-4 text-center text-sm text-zinc-600">
                ¿Ya tenés cuenta?{" "}
                <a href="/login" className="font-bold text-tienda-800 underline underline-offset-2">
                  Entrar
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
