"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

/* MobileBottomNav (ex-"Nav"): floating bottom tab bar, mobile/tablet only (<lg).
   On desktop navigation lives in DesktopSidebar, so this hides on lg+. */

function Icon({ d, active }: { d: string; active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[22px] w-[22px]"
    >
      <path d={d} />
    </svg>
  );
}

const ITEMS = [
  { href: "/dashboard", label: "Inicio", d: "M3 10.5 12 3l9 7.5V21H3z M9 21v-6h6v6" },
  { href: "/vender", label: "Vender", d: "M4 7h16v13H4z M4 7l2-3h12l2 3 M9 12h6 M12 9v6" },
  { href: "/productos", label: "Productos", d: "M4 4h7v7H4z M13 13h7v7h-7z M13 4h7v6h-7z M4 13h7v8H4z" },
  { href: "/caja", label: "Caja", d: "M2.5 7.5h19v9h-19zM12 9.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8z" },
  { href: "/menu", label: "Menú", d: "M3.5 3.5h7v7h-7zM13.5 3.5h7v7h-7zM3.5 13.5h7v7h-7zM13.5 13.5h7v7h-7z" },
] as const;

/* Routes grouped inside the "/menu" hub (they keep the Menú tab active). */
const MENU_HUB_ROUTES = ["/menu", "/conteo", "/movimientos", "/reportes", "/gastos", "/vencimientos", "/recordatorios", "/equipo", "/proveedores", "/pedidos"];

function esActivo(href: string, path: string): boolean {
  if (href === "/menu") return MENU_HUB_ROUTES.some((h) => path === h || path.startsWith(h));
  if (href === "/dashboard") return path === "/dashboard";
  return path === href || path.startsWith(href);
}

export default function MobileBottomNav() {
  const path = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-3 lg:hidden"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
    >
      <ul className="glass flex items-center gap-1 rounded-[1.75rem] border border-zinc-200/70 p-1.5 shadow-card">
        {ITEMS.map((it) => {
          const active = esActivo(it.href, path);
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`press flex flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-[11px] font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700 ${
                  active ? "bg-tienda-50 text-tienda-800" : "text-zinc-500 hover:bg-zinc-100 hover:text-tinta"
                }`}
              >
                <Icon d={it.d} active={active} />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
