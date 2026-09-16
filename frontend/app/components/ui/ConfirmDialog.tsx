"use client";

import { useEffect, useState } from "react";

/* ConfirmDialog (ex-"Confirm"): custom confirmation dialogs instead of the
   native confirm() (ugly + blocks everything). Promise API with a queue:
   Escape and outside-click cancel. Mount <ConfirmDialogHost /> once in layout. */

export type ConfirmOpts = {
  titulo: string;
  mensaje?: string;
  confirmar?: string;
  cancelar?: string;
  danger?: boolean;
};

type Pending = ConfirmOpts & { id: number; resolve: (v: boolean) => void };

let seq = 0;
const cola: Pending[] = [];
const subs = new Set<() => void>();

function emit() {
  subs.forEach((fn) => fn());
}

export function confirmDialog(opts: ConfirmOpts): Promise<boolean> {
  return new Promise((resolve) => {
    cola.push({ ...opts, id: ++seq, resolve });
    emit();
  });
}

/* Deprecated alias: use confirmDialog. */
export const confirmDlg = confirmDialog;

function cerrar(v: boolean) {
  const primero = cola.shift();
  primero?.resolve(v);
  emit();
}

export default function ConfirmDialogHost() {
  const [, setTick] = useState(0);
  const actual = cola[0];

  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    subs.add(fn);
    return () => {
      subs.delete(fn);
    };
  }, []);

  useEffect(() => {
    if (!actual) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [actual]);

  if (!actual) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center" role="presentation">
      <button
        type="button"
        aria-label="Cerrar diálogo"
        onClick={() => cerrar(false)}
        className="absolute inset-0 cursor-default bg-tinta/50"
      />
      <div
        key={actual.id}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-titulo"
        aria-describedby={actual.mensaje ? "confirm-mensaje" : undefined}
        className="rise relative w-full max-w-sm rounded-card border border-zinc-200 bg-white p-5 shadow-card"
      >
        <span
          aria-hidden="true"
          className={`flex h-11 w-11 items-center justify-center rounded-full ${
            actual.danger ? "bg-red-50 text-peligro" : "bg-tienda-50 text-tienda-700"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {actual.danger ? (
              <path d="M12 3 22 20H2zM12 9.5V14M12 17v.01" />
            ) : (
              <path d="M20 6 9 17l-5-5" />
            )}
          </svg>
        </span>
        <h2 id="confirm-titulo" className="mt-3 font-display text-xl font-extrabold tracking-tight text-tinta">
          {actual.titulo}
        </h2>
        {actual.mensaje && (
          <p id="confirm-mensaje" className="mt-1 text-sm text-zinc-600">
            {actual.mensaje}
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            autoFocus
            onClick={() => cerrar(false)}
            className="press rounded-action border border-zinc-300 bg-white px-4 py-3 font-bold text-tinta hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700"
          >
            {actual.cancelar ?? "Cancelar"}
          </button>
          <button
            type="button"
            onClick={() => cerrar(true)}
            className={`press rounded-action px-4 py-3 font-extrabold text-white shadow-pop focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700 ${
              actual.danger ? "bg-peligro hover:brightness-110" : "bg-tienda-700 hover:bg-tienda-800"
            }`}
          >
            {actual.confirmar ?? "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
