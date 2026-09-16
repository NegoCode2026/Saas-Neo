"use client";

import { useState } from "react";

/* LandingTopNavbar (ex-"LandingNav"): "fluid island" floating pill nav,
   detached from the top (not a stuck bar). Single row on desktop (64px),
   dropdown on mobile. One label per intent. */
export default function LandingTopNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sticky top-0 z-40 px-3 pt-3 md:px-6 md:pt-4">
      <div className="glass mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 rounded-full border border-zinc-200/70 px-3 shadow-card md:h-16 md:px-4">
        <a href="/" className="flex items-center gap-2 pl-1" aria-label="StockLocal, inicio">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-tienda-700 font-display text-lg font-extrabold text-white shadow-pop"
          >
            S
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight text-tinta">StockLocal</span>
        </a>

        <nav aria-label="Secciones" className="hidden items-center gap-0.5 text-sm font-bold md:flex">
          <a href="#como-funciona" className="rounded-full px-4 py-2.5 text-zinc-600 transition-colors duration-200 hover:bg-zinc-100 hover:text-tinta">
            Cómo funciona
          </a>
          <a href="#precios" className="rounded-full px-4 py-2.5 text-zinc-600 transition-colors duration-200 hover:bg-zinc-100 hover:text-tinta">
            Precios
          </a>
          <a href="#pilotos" className="rounded-full px-4 py-2.5 text-zinc-600 transition-colors duration-200 hover:bg-zinc-100 hover:text-tinta">
            Pilotos
          </a>
        </nav>

        <div className="hidden items-center gap-1.5 md:flex">
          <a href="/login" className="press rounded-full px-5 py-2.5 text-sm font-bold text-tinta hover:bg-zinc-100">
            Entrar
          </a>
          <a
            href="/register"
            className="press rounded-full bg-tienda-700 px-5 py-2.5 text-sm font-bold text-white shadow-pop hover:bg-tienda-800 active:bg-tienda-800"
          >
            Crear mi tienda gratis
          </a>
        </div>

        <button
          type="button"
          className="press rounded-full border border-zinc-300 bg-white p-3 md:hidden"
          aria-expanded={open}
          aria-controls="landing-menu"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen((o) => !o)}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <nav
          id="landing-menu"
          aria-label="Menú móvil"
          className="glass mx-auto mt-2 max-w-5xl rounded-[1.75rem] border border-zinc-200 p-3 shadow-card md:hidden"
        >
          {[
            ["Cómo funciona", "#como-funciona"],
            ["Precios", "#precios"],
            ["Pilotos", "#pilotos"],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="block rounded-2xl px-3 py-3.5 font-bold text-tinta hover:bg-zinc-100"
            >
              {label}
            </a>
          ))}
          <div className="mt-2 grid gap-2">
            <a
              href="/register"
              className="press rounded-action bg-tienda-700 p-4 text-center font-bold text-white hover:bg-tienda-800"
            >
              Crear mi tienda gratis
            </a>
            <a
              href="/login"
              className="press rounded-action border border-zinc-300 bg-white p-3.5 text-center font-bold text-tinta hover:bg-zinc-100"
            >
              Entrar
            </a>
          </div>
        </nav>
      )}
    </div>
  );
}
