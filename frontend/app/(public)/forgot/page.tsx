"use client";

import { useState } from "react";
import { forgotPassword } from "@/features/auth/api";
import { BtnPrimary, Field, inputCls } from "../../components/ui/SharedControls";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [devLink, setDevLink] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMsg("");
    setDevLink("");
    try {
      const r = await forgotPassword(email);
      setMsg("Si el email existe, te mandamos un link para elegir una nueva contraseña.");
      if (r.devLink) setDevLink(r.devLink);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "No se pudo enviar. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bleed -mb-32 -mt-4">
      <div className="auth-bg grid min-h-[92dvh] place-items-center px-4 pb-40 pt-10">
        <div className="rise w-full max-w-md">
          <a
            href="/login"
            className="mb-4 inline-block rounded-full px-3 py-2.5 text-sm font-bold text-zinc-600 hover:bg-white/70 hover:text-tinta"
          >
            ← Volver a entrar
          </a>
          <div className="rounded-[2rem] border border-zinc-200/80 bg-white/70 p-2 shadow-card">
            <div className="rounded-[calc(2rem-0.5rem)] border border-zinc-200 bg-white p-6 shadow-card md:p-8">
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-tinta">Recuperar contraseña</h1>
              <p className="mt-1 text-sm text-zinc-600">Escribí tu email y te mandamos un link para cambiarla.</p>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <Field label="Email" htmlFor="forgot-email">
                  <input
                    id="forgot-email"
                    className={inputCls}
                    type="email"
                    autoComplete="email"
                    placeholder="vos@tutienta.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Field>
                <BtnPrimary type="submit" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar link"}
                </BtnPrimary>
              </form>

              {msg && (
                <p role="status" className="mt-4 rounded-xl border border-tienda-100 bg-tienda-50 p-3 text-sm font-medium text-tienda-900">
                  {msg}
                </p>
              )}
              {devLink && (
                <p className="mt-3 break-all rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <strong>Modo desarrollo:</strong>{" "}
                  <a className="underline" href={devLink}>
                    {devLink}
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
