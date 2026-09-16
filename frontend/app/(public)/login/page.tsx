"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/features/auth/api";
import { BtnPrimary, Field, inputCls } from "../../components/ui/SharedControls";

/* Auth centrada: doble marco, marca grande, formulario protagónico.
   Una sola acción primaria. Volver al inicio siempre visible. */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setErr("");
    setLoading(true);
    try {
      await login({ email, password });
      router.push("/dashboard");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "No pudiste entrar. Revisá tus datos.");
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
                Bienvenido de nuevo
              </h1>
              <p className="mt-1 text-sm text-zinc-600">Entrá y seguí vendiendo en segundos.</p>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <Field label="Email" htmlFor="login-email">
                  <input
                    id="login-email"
                    className={inputCls}
                    type="email"
                    autoComplete="email"
                    placeholder="vos@tutienta.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Contraseña" htmlFor="login-pass">
                  <input
                    id="login-pass"
                    className={inputCls}
                    type="password"
                    autoComplete="current-password"
                    placeholder="Tu clave"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Field>
                <p className="text-right">
                  <a href="/forgot" className="text-sm font-bold text-tienda-800 underline underline-offset-2">
                    ¿Olvidaste tu contraseña?
                  </a>
                </p>
                {err && (
                  <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-peligro">
                    {err}
                  </p>
                )}
                <BtnPrimary type="submit" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar a mi tienda"}
                </BtnPrimary>
              </form>

              <p className="mt-5 border-t border-zinc-100 pt-4 text-center text-sm text-zinc-600">
                ¿Sin cuenta?{" "}
                <a href="/register" className="font-bold text-tienda-800 underline underline-offset-2">
                  Creá tu negocio gratis
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
