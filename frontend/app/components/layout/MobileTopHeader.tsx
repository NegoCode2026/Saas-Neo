"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { fetchResumen } from "@/features/reporting/api";

/* MobileTopHeader (ex-"SiteHeader"): compact top bar for mobile/tablet (<lg).
   Hidden on desktop (lg:hidden) where DesktopSidebar owns navigation.
   Only brand + low-stock bell. */
export default function MobileTopHeader() {
  const path = usePathname();
  const [alertas, setAlertas] = useState(0);

  useEffect(() => {
    fetchResumen()
      .then((r) => setAlertas(r.bajoStock ?? 0))
      .catch(() => {});
  }, [path]);

  return (
    <header className="glass sticky top-0 z-30 border-b border-zinc-200/70 lg:hidden">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
        <a href="/dashboard" className="flex items-center gap-2" aria-label="StockLocal, inicio">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-tienda-600 to-cyan-500 shadow-pop"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3 20 7.5 12 12 4 7.5zM4 12l8 4.5 8-4.5M4 16.5 12 21l8-4.5" />
            </svg>
          </span>
          <span className="font-display text-base font-extrabold tracking-tight text-tinta">StockLocal</span>
        </a>
        <a
          href="/productos"
          aria-label={alertas > 0 ? `${alertas} productos con poco stock` : "Sin alertas de stock"}
          className="press relative flex h-11 w-11 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100 hover:text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M10.3 21a2 2 0 0 0 3.4 0" />
          </svg>
          {alertas > 0 && (
            <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-extrabold text-white">
              {alertas > 9 ? "9+" : alertas}
            </span>
          )}
        </a>
      </div>
    </header>
  );
}
