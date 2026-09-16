"use client";

import { useEffect, useState } from "react";

const CLAVE = "stocklocal_onboarding";

/* GettingStartedChecklist (ex-"Onboarding"): first-steps card shown until
   the business registers its first product + first sale (or dismisses it). */
export default function GettingStartedChecklist({
  tieneProductos,
  tieneVentas,
}: {
  tieneProductos: boolean;
  tieneVentas: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(CLAVE) !== "1") setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    if (tieneProductos && tieneVentas) {
      try {
        localStorage.setItem(CLAVE, "1");
      } catch {
        /* sin storage, se oculta igual abajo */
      }
      setVisible(false);
    }
  }, [tieneProductos, tieneVentas]);

  if (!visible) return null;

  function cerrar() {
    try {
      localStorage.setItem(CLAVE, "1");
    } catch {
      /* nada */
    }
    setVisible(false);
  }

  const pasos = [
    { texto: "Agregá tu primer producto", href: "/productos#registro", hecho: tieneProductos },
    { texto: "Hacé tu primera venta", href: "/vender", hecho: tieneVentas },
    { texto: "Invitá a tu equipo", href: "/equipo", hecho: false },
  ];

  return (
    <section aria-label="Primeros pasos" className="rounded-card border border-tienda-100 bg-tienda-50 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-extrabold text-tinta">Empezá en 3 pasos</p>
          <p className="text-sm text-zinc-600">Lo esencial para que la tienda quede andando hoy.</p>
        </div>
        <button
          type="button"
          onClick={cerrar}
          aria-label="Ocultar primeros pasos"
          className="press rounded-full px-3 py-2.5 text-sm font-bold text-zinc-500 hover:bg-white hover:text-tinta"
        >
          Ocultar
        </button>
      </div>
      <ol className="mt-3 space-y-2">
        {pasos.map((p, i) => (
          <li key={p.texto}>
            <a
              href={p.href}
              className="press flex items-center gap-3 rounded-2xl border border-tienda-100 bg-white p-3 hover:bg-tienda-50/50"
            >
              <span
                aria-hidden="true"
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                  p.hecho ? "bg-tienda-700 text-white" : "border border-zinc-300 text-zinc-500"
                }`}
              >
                {p.hecho ? "✓" : i + 1}
              </span>
              <span className={`font-bold ${p.hecho ? "text-zinc-500 line-through" : "text-tinta"}`}>{p.texto}</span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
