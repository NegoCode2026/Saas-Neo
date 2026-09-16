"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { fetchResumen } from "@/features/reporting/api";
import { logout } from "@/features/auth/api";
import { Icon, type IconName } from "../ui/AppIcons";

type Item = { href: string; label: string; icon: IconName; match: (p: string) => boolean };

const MENU: Item[] = [
  { href: "/dashboard", label: "Inicio", icon: "home", match: (p) => p === "/dashboard" },
  { href: "/productos", label: "Productos", icon: "box", match: (p) => p === "/productos" },
  { href: "/conteo", label: "Conteo", icon: "clipboard", match: (p) => p.startsWith("/conteo") },
  { href: "/vender", label: "Ventas", icon: "cart", match: (p) => p.startsWith("/vender") },
  { href: "/movimientos", label: "Historial", icon: "history", match: (p) => p.startsWith("/movimientos") },
  { href: "/reportes", label: "Reportes", icon: "chart", match: (p) => p.startsWith("/reportes") },
];

const NEGOCIO: Item[] = [
  { href: "/caja", label: "Caja", icon: "cash", match: (p) => p.startsWith("/caja") },
  { href: "/gastos", label: "Gastos", icon: "receipt", match: (p) => p.startsWith("/gastos") },
  { href: "/vencimientos", label: "Vencimientos", icon: "calendar", match: (p) => p.startsWith("/vencimientos") },
  { href: "/recordatorios", label: "Recordatorios", icon: "bell", match: (p) => p.startsWith("/recordatorios") },
  { href: "/equipo", label: "Equipo", icon: "users", match: (p) => p.startsWith("/equipo") },
  { href: "/proveedores", label: "Proveedores", icon: "truck", match: (p) => p.startsWith("/proveedores") },
  { href: "/pedidos", label: "Pedidos", icon: "box", match: (p) => p.startsWith("/pedidos") },
];

const linkCls = (active: boolean) =>
  `press flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700 ${
    active ? "bg-tienda-700 text-white shadow-pop" : "text-zinc-600 hover:bg-zinc-100 hover:text-tinta"
  }`;

/* DesktopSidebar (ex-"Sidebar"): full system nav for desktop (lg+).
   Top "Vender ahora" CTA, main menu, business section, low-stock alert
   and logout. Hidden on mobile: there MobileBottomNav owns navigation. */
export default function DesktopSidebar() {
  const path = usePathname();
  const router = useRouter();
  const [alertas, setAlertas] = useState(0);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    fetchResumen()
      .then((r) => setAlertas(r.bajoStock ?? 0))
      .catch(() => {});
  }, [path]);

  /* La sidebar se queda donde estás: al cambiar de vista lleva su scroll
     hasta el ítem activo (sin mover la página). Si estás en Proveedores,
     ahí se mantiene, sin tener que bajar a mano. */
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.querySelector('[aria-current="page"]');
    if (!(active instanceof HTMLElement)) return;
    const navRect = nav.getBoundingClientRect();
    const elRect = active.getBoundingClientRect();
    if (elRect.top < navRect.top || elRect.bottom > navRect.bottom) {
      nav.scrollTo({
        top: nav.scrollTop + (elRect.top - navRect.top) - nav.clientHeight / 2 + elRect.height / 2,
      });
    }
  }, [path]);

  async function salir() {
    await logout();
    router.replace("/login");
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-zinc-200 bg-white lg:flex">
      <Link href="/dashboard" className="flex h-16 items-center gap-2 border-b border-zinc-100 px-5" aria-label="StockLocal inicio">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-tienda-600 to-cyan-500 shadow-pop"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3 20 7.5 12 12 4 7.5zM4 12l8 4.5 8-4.5M4 16.5 12 21l8-4.5" />
          </svg>
        </span>
        <span className="font-display text-lg font-extrabold tracking-tight text-tinta">
          STOCKLOCAL
        </span>
      </Link>

      <nav ref={navRef} aria-label="Principal" className="flex-1 space-y-6 overflow-y-auto p-3">
        <div className="space-y-2">
          <Link
            href="/vender"
            className="press flex items-center justify-center gap-2 rounded-action bg-tienda-700 px-4 py-3.5 font-extrabold text-white shadow-pop hover:bg-tienda-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700 focus-visible:ring-offset-2"
          >
            <Icon name="cart" active className="h-5 w-5" />
            Vender ahora
          </Link>
          <Link
            href="/productos#registro"
            className="press flex items-center justify-center gap-2 rounded-action border border-zinc-300 bg-white px-4 py-3 font-bold text-tinta hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700 focus-visible:ring-offset-2"
          >
            <Icon name="plus" className="h-5 w-5" />
            Agregar producto
          </Link>
        </div>

        <div>
          <p className="px-3 pb-1 text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
            Menú
          </p>
          <ul className="space-y-0.5">
            {MENU.map((it) => {
              const active = it.match(path);
              return (
                <li key={it.href}>
                  <Link href={it.href} aria-current={active ? "page" : undefined} className={linkCls(active)}>
                    <Icon name={it.icon} active={active} />
                    {it.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p className="px-3 pb-1 text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
            Negocio
          </p>
          <ul className="space-y-0.5">
            {NEGOCIO.map((it) => {
              const active = it.match(path);
              return (
                <li key={it.href}>
                  <Link href={it.href} aria-current={active ? "page" : undefined} className={linkCls(active)}>
                    <Icon name={it.icon} active={active} />
                    {it.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <div className="space-y-2 border-t border-zinc-100 p-3">
        {alertas > 0 && (
          <Link
            href="/productos"
            className="press block rounded-2xl border border-amber-200 bg-amber-50 p-3 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700"
          >
            <p className="text-sm font-extrabold tabular-nums text-amber-900">{alertas} con poco stock</p>
            <p className="text-xs font-bold text-amber-700">Revisar productos</p>
          </Link>
        )}
        <button
          type="button"
          onClick={salir}
          className="press flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-zinc-500 hover:bg-zinc-100 hover:text-peligro focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700"
        >
          <Icon name="logout" />
          Salir
        </button>
      </div>
    </aside>
  );
}
