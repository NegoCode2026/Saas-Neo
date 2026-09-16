import LandingTopNavbar from "../components/landing/LandingTopNavbar";
import ProductPhonePreview from "../components/landing/ProductPhonePreview";
import ScrollRevealAnimation from "../components/landing/ScrollRevealAnimation";
import { DoubleFrameCard, CallToActionLink } from "../components/ui/SharedControls";

/* Landing — lectura: SaaS para tenderos del Eje Cafetero, lenguaje cálido
   de mercado. Dials: varianza 7, motion 4 (reveal + marquee), densidad 4.
   Familias de sección distintas: hero split, cinta, banda de datos,
   manifiesto editorial, bento, precios asimétricos, bloque CTA, footer. */

const CINTA = ["Arroz", "Café", "Panela", "Huevos", "Aceite", "Azúcar", "Sal", "Pasta", "Frijol", "Chocolate"];

const DATOS = [
  { numero: "30 seg", texto: "para registrar un producto. Nombre y dos precios." },
  { numero: "1 min", texto: "para crear tu tienda y empezar a vender." },
  { numero: "$0", texto: "de instalación. Se abre desde el navegador del celular." },
];

const PASOS = [
  ["Creá tu tienda", "Nombre, email y clave. Sin tarjeta, sin técnico."],
  ["Cargá tus productos", "Primero los que más rotan. Después el resto."],
  ["Vendé desde el celular", "El stock baja solo y ves tu ganancia al cerrar."],
];

const FEATURES = [
  {
    titulo: "Punto de venta que descuenta solo",
    texto: "Cobrás y el stock se actualiza en el acto. Si no alcanza, te avisa antes de vender. Nunca más vendés lo que no tenés.",
    tag: "POS",
  },
  {
    titulo: "Alertas antes de quedarte sin nada",
    texto: "Definís el mínimo por producto y te avisa cuáles pedir hoy, con nombre y cantidad.",
    tag: "Stock",
  },
  {
    titulo: "Ganancia real, no sensaciones",
    texto: "Ventas menos costo, valor del inventario y los más vendidos. Números claros sin Excel.",
    tag: "Reportes",
  },
  {
    titulo: "Tu equipo, cada uno con su clave",
    texto: "El dueño maneja todo; los empleados venden y consultan. Cada negocio ve solo lo suyo.",
    tag: "Equipo",
  },
];

const PLANES = [
  {
    nombre: "Estándar",
    precio: "$59.900",
    detalle: "Para la tienda que ya quiere control real.",
    features: ["3 usuarios", "Productos ilimitados", "POS + alertas de stock", "Reportes de ganancia"],
    destacado: true,
  },
  { nombre: "Básico", precio: "$29.900", detalle: "1 usuario · 200 productos", destacado: false },
  { nombre: "Pro", precio: "$99.900", detalle: "Multisucursal · soporte prioritario", destacado: false },
];

const DESTACADO = PLANES[0]! as { nombre: string; precio: string; detalle: string; features: string[] };

export default function Landing() {
  return (
    <div className="bleed -mt-4">
      <LandingTopNavbar />

      {/* HERO — asimétrico: copia izquierda, producto derecha */}
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="grid items-center gap-12 py-10 md:py-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:py-20">
          <div>
            <p className="rise inline-flex items-center gap-2 rounded-full border border-tienda-100 bg-tienda-50 px-3 py-1.5 text-xs font-bold text-tienda-800">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-tienda-700" />
              Hecho en Armenia, Quindío
            </p>
            <h1
              className="rise mt-5 font-display text-5xl font-extrabold leading-[1.02] tracking-tight text-tinta md:text-6xl lg:text-7xl"
              style={{ animationDelay: "60ms" }}
            >
              Tu inventario al día, <span className="text-tienda-700">sin cuaderno</span>
            </h1>
            <p className="rise mt-5 max-w-[44ch] text-base leading-relaxed text-zinc-600 md:text-lg" style={{ animationDelay: "120ms" }}>
              Para tiendas, minimercados y ferreterías del Eje Cafetero: registrás rápido, vendés en segundos y ves tu ganancia.
            </p>
            <div className="rise mt-7 flex flex-wrap items-center gap-3" style={{ animationDelay: "180ms" }}>
              <CallToActionLink href="/register">Crear mi tienda gratis</CallToActionLink>
              <a
                href="/login"
                className="press rounded-full px-5 py-3.5 font-bold text-tinta underline decoration-zinc-300 decoration-2 underline-offset-4 hover:bg-white/70"
              >
                Entrar
              </a>
            </div>
            <p className="rise mt-4 text-xs font-medium text-zinc-500" style={{ animationDelay: "240ms" }}>
              Sin tarjeta · En español · Desde el celular
            </p>
          </div>

          <div className="rise lg:justify-self-end" style={{ animationDelay: "320ms" }}>
            <ProductPhonePreview />
          </div>
        </div>
      </div>

      {/* CINTA DE MERCADO — única marquesina de la página */}
      <div className="overflow-hidden border-y border-zinc-200 bg-white" aria-hidden="true">
        <div className="marquee-track flex w-max items-center py-3">
          {[0, 1].map((n) => (
            <p key={n} className="flex items-center whitespace-nowrap font-display text-lg font-extrabold uppercase tracking-wide text-tinta">
              {CINTA.map((w) => (
                <span key={w} className="flex items-center">
                  <span className="px-6">{w}</span>
                  <span className="text-tienda-600">·</span>
                </span>
              ))}
            </p>
          ))}
        </div>
      </div>

      {/* BANDA DE DATOS — hechos del producto, sin inventar métricas */}
      <div className="mx-auto max-w-6xl px-4 py-14 md:px-8 md:py-20">
        <dl className="grid gap-6 md:grid-cols-3 md:gap-10">
          {DATOS.map((d, i) => (
            <ScrollRevealAnimation key={d.numero} delay={i * 80}>
              <div className="border-l-2 border-tienda-700 pl-5">
                <dt className="font-display text-4xl font-extrabold tracking-tight text-tinta md:text-5xl">{d.numero}</dt>
                <dd className="mt-1 max-w-[34ch] text-sm leading-relaxed text-zinc-600 md:text-base">{d.texto}</dd>
              </div>
            </ScrollRevealAnimation>
          ))}
        </dl>
      </div>

      {/* MANIFIESTO + PASOS — filas editoriales, sin cards */}
      <div id="como-funciona" className="border-y border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 md:px-8 md:py-24">
          <ScrollRevealAnimation>
            <p className="max-w-[26ch] font-display text-3xl font-extrabold leading-tight tracking-tight text-tinta md:text-5xl">
              Todo lo que el cuaderno no te dice
            </p>
          </ScrollRevealAnimation>
          <ol className="mt-10 divide-y divide-zinc-200 border-y border-zinc-200">
            {PASOS.map(([titulo, texto], i) => (
              <ScrollRevealAnimation key={titulo} delay={i * 60}>
                <li className="grid gap-2 py-6 md:grid-cols-[110px_1fr_1.4fr] md:items-baseline md:gap-8">
                  <span aria-hidden="true" className="font-display text-4xl font-extrabold tabular-nums text-tienda-600">
                    0{i + 1}
                  </span>
                  <p className="font-display text-xl font-extrabold tracking-tight text-tinta md:text-2xl">{titulo}</p>
                  <p className="max-w-[52ch] text-sm leading-relaxed text-zinc-600 md:text-base">{texto}</p>
                </li>
              </ScrollRevealAnimation>
            ))}
          </ol>
        </div>
      </div>

      {/* FEATURES — bento asimétrico con double-bezel y fondos variados */}
      <div className="mx-auto max-w-6xl px-4 py-14 md:px-8 md:py-24">
        <ScrollRevealAnimation>
          <h2 className="max-w-[22ch] font-display text-3xl font-extrabold tracking-tight text-tinta md:text-4xl">
            Cuatro cosas que cambian tu día
          </h2>
        </ScrollRevealAnimation>
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <ScrollRevealAnimation className="h-full lg:row-span-2">
            <DoubleFrameCard frame="brand" className="lift h-full">
              <div className="flex h-full flex-col p-6 md:p-8">
                <span className="w-fit rounded-full bg-tienda-700 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                  {FEATURES[0].tag}
                </span>
                <p className="mt-5 font-display text-2xl font-extrabold leading-tight tracking-tight text-tinta md:text-3xl">
                  {FEATURES[0].titulo}
                </p>
                <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-zinc-600 md:text-base">{FEATURES[0].texto}</p>
                <div className="mt-auto pt-8">
                  <CallToActionLink href="/register" variant="primary">
                    Crear mi tienda gratis
                  </CallToActionLink>
                </div>
              </div>
            </DoubleFrameCard>
          </ScrollRevealAnimation>
          <div className="grid gap-4">
            {FEATURES.slice(1).map((f, i) => (
              <ScrollRevealAnimation key={f.titulo} delay={i * 70}>
                <DoubleFrameCard className="lift">
                  <div className="p-6">
                    <span className="w-fit rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-zinc-600">
                      {f.tag}
                    </span>
                    <p className="mt-4 font-display text-lg font-extrabold tracking-tight text-tinta">{f.titulo}</p>
                    <p className="mt-2 max-w-[46ch] text-sm leading-relaxed text-zinc-600">{f.texto}</p>
                  </div>
                </DoubleFrameCard>
              </ScrollRevealAnimation>
            ))}
          </div>
        </div>
      </div>

      {/* PRECIOS — asimétrico: plan destacado grande + dos compactos */}
      <div id="precios" className="border-y border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl scroll-mt-24 px-4 py-14 md:px-8 md:py-24">
          <ScrollRevealAnimation>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-tinta md:text-4xl">Precio de tienda</h2>
            <p className="mt-2 max-w-[55ch] text-sm text-zinc-600 md:text-base">
              Suscripción mensual en pesos. Precios de lanzamiento, se confirman con los pilotos de Armenia.
            </p>
          </ScrollRevealAnimation>
          <div className="mt-10 grid gap-4 lg:grid-cols-5">
            <ScrollRevealAnimation className="lg:col-span-3">
              <DoubleFrameCard frame="brand" className="lift h-full">
                <div className="flex h-full flex-col p-6 md:p-8">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-xl font-extrabold text-tinta">{DESTACADO.nombre}</p>
                    <span className="rounded-full bg-tienda-700 px-2.5 py-0.5 text-[11px] font-bold text-white">El más usado</span>
                  </div>
                  <p className="mt-3 font-display text-5xl font-extrabold tabular-nums tracking-tight text-tinta">
                    {DESTACADO.precio}
                    <span className="text-base font-bold text-zinc-500"> /mes</span>
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">{DESTACADO.detalle}</p>
                  <ul className="mt-6 grid gap-2 text-sm font-medium text-tinta sm:grid-cols-2">
                    {DESTACADO.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-tienda-700" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 12.5 9.5 18 20 6" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-8">
                    <CallToActionLink href="/register">Crear mi tienda gratis</CallToActionLink>
                  </div>
                </div>
              </DoubleFrameCard>
            </ScrollRevealAnimation>
            <div className="grid gap-4 lg:col-span-2">
              {PLANES.slice(1).map((p, i) => (
                <ScrollRevealAnimation key={p.nombre} delay={i * 70} className="h-full">
                  <DoubleFrameCard className="lift h-full">
                    <div className="flex h-full flex-col p-6">
                      <p className="font-display text-lg font-extrabold text-tinta">{p.nombre}</p>
                      <p className="mt-2 font-display text-2xl font-extrabold tabular-nums text-tinta">
                        {p.precio}
                        <span className="text-sm font-bold text-zinc-500"> /mes</span>
                      </p>
                      <p className="mt-1 text-sm text-zinc-600">{p.detalle}</p>
                    </div>
                  </DoubleFrameCard>
                </ScrollRevealAnimation>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA FINAL — bloque azul a sangre, botón invertido */}
      <div id="pilotos" className="scroll-mt-24 bg-tienda-700">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
          <ScrollRevealAnimation>
            <div className="lg:flex lg:items-end lg:justify-between lg:gap-12">
              <div>
                <p className="max-w-[18ch] font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white md:text-6xl">
                  ¿Tenés tienda en Armenia?
                </p>
                <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-white/85">
                  Buscamos 5 negocios para probar gratis, visitarlos y ajustar la app con su feedback real.
                </p>
              </div>
              <div className="mt-8 shrink-0 lg:mt-0">
                <CallToActionLink href="/register" variant="invert">
                  Crear mi tienda gratis
                </CallToActionLink>
              </div>
            </div>
          </ScrollRevealAnimation>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="-mb-32 border-t border-zinc-200 bg-white pb-40">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 pt-8 text-sm text-zinc-600 md:flex-row md:items-center md:justify-between md:px-8">
          <p className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 items-center justify-center rounded-xl bg-tienda-700 font-display text-sm font-extrabold text-white"
            >
              S
            </span>
            <span><span className="font-extrabold text-tinta">StockLocal</span> · Armenia, Quindío</span>
          </p>
          <nav aria-label="Pie de página" className="flex flex-wrap gap-x-6 gap-y-2 font-bold">
            <a href="#como-funciona" className="hover:text-tinta">Cómo funciona</a>
            <a href="#precios" className="hover:text-tinta">Precios</a>
            <a href="/login" className="hover:text-tinta">Entrar</a>
            <a href="/register" className="hover:text-tinta">Crear cuenta</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
