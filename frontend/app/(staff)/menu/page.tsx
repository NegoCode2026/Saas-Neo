import { PageHeader } from "../../components/ui/SharedControls";
import { Icon, type IconName } from "../../components/ui/AppIcons";

const SECCIONES: { href: string; label: string; hint: string; icon: IconName }[] = [
  { href: "/conteo", label: "Conteo", hint: "Ajustar stock real", icon: "clipboard" },
  { href: "/caja", label: "Caja", hint: "Arqueo y cierres", icon: "cash" },
  { href: "/gastos", label: "Gastos", hint: "Egresos del negocio", icon: "receipt" },
  { href: "/vencimientos", label: "Vencimientos", hint: "Lo que está por vencer", icon: "calendar" },
  { href: "/recordatorios", label: "Recordatorios", hint: "Avisos por WhatsApp", icon: "bell" },
  { href: "/movimientos", label: "Historial", hint: "Entradas y salidas", icon: "history" },
  { href: "/reportes", label: "Reportes", hint: "Números y CSV", icon: "chart" },
  { href: "/equipo", label: "Equipo", hint: "Usuarios y roles", icon: "users" },
  { href: "/proveedores", label: "Proveedores", hint: "A quién le comprás", icon: "truck" },
  { href: "/pedidos", label: "Pedidos", hint: "Reposición de stock", icon: "box" },
];

/* MenuHubPage (route /menu, ex-"/mas"): mobile hub with everything that
   doesn't fit in the 5 bottom tabs, one tap away. */
export default function MenuHubPage() {
  return (
    <div className="w-full space-y-4">
      <PageHeader title="Más" hint="Todo el sistema, a un toque." />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECCIONES.map((s) => (
          <li key={s.href}>
            <a
              href={s.href}
              className="press flex items-center gap-3 rounded-card border border-zinc-200 bg-white p-4 shadow-card hover:bg-zinc-50"
            >
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tienda-50 text-tienda-700"
              >
                <Icon name={s.icon} />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-bold text-tinta">{s.label}</span>
                <span className="block truncate text-xs text-zinc-500">{s.hint}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
