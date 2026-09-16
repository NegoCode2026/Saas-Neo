"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { resetPassword } from "@/features/auth/api";
import { BtnPrimary, Field, inputCls } from "../../components/ui/SharedControls";

export default function ResetPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Leemos el token de la URL en el cliente (evita el requisito de Suspense).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setToken(p.get("token") ?? "");
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setErr("");
    if (password !== password2) {
      setErr("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword({ token, password });
      router.push("/login");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "No se pudo cambiar la contraseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bleed -mb-32 -mt-4">
      <div className="auth-bg grid min-h-[92dvh] place-items-center px-4 pb-40 pt-10">
        <div className="rise w-full max-w-md">
          <div className="rounded-[2rem] border border-zinc-200/80 bg-white/70 p-2 shadow-card">
            <div className="rounded-[calc(2rem-0.5rem)] border border-zinc-200 bg-white p-6 shadow-card md:p-8">
              <h1 className="font-display text-2xl font-extrabold tracking-tight text-tinta">Nueva contraseña</h1>
              <p className="mt-1 text-sm text-zinc-600">Elegí una nueva clave para tu cuenta.</p>

              {!token ? (
                <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-peligro">
                  El link no trae un token válido. Pedí uno nuevo desde "Recuperar contraseña".
                </p>
              ) : (
                <form onSubmit={onSubmit} className="mt-6 space-y-4">
                  <Field label="Nueva contraseña" htmlFor="reset-pass" helper="Mínimo 6 caracteres.">
                    <input
                      id="reset-pass"
                      className={inputCls}
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </Field>
                  <Field label="Repetí la contraseña" htmlFor="reset-pass2">
                    <input
                      id="reset-pass2"
                      className={inputCls}
                      type="password"
                      autoComplete="new-password"
                      value={password2}
                      onChange={(e) => setPassword2(e.target.value)}
                      required
                      minLength={6}
                    />
                  </Field>
                  {err && (
                    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-peligro">
                      {err}
                    </p>
                  )}
                  <BtnPrimary type="submit" disabled={loading}>
                    {loading ? "Guardando..." : "Cambiar contraseña"}
                  </BtnPrimary>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
