import { CallToActionLink } from "../../components/ui/SharedControls";

export default function OfflinePage() {
  return (
    <div className="bleed -mt-4">
      <div className="auth-bg grid min-h-[92dvh] place-items-center px-4 pb-40 pt-10">
        <div className="w-full max-w-md rounded-[2rem] border border-zinc-200/80 bg-white/70 p-2 shadow-card">
          <div className="rounded-[calc(2rem-0.5rem)] border border-zinc-200 bg-white p-6 text-center md:p-8">
            <span
              aria-hidden="true"
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-tienda-50 text-tienda-800"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 8.5a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8.5 15.5a6 6 0 0 1 7 0M12 19h.01M3 3l18 18" />
              </svg>
            </span>
            <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-tinta">Sin conexión</h1>
            <p className="mt-2 text-sm text-zinc-600">
              No hay internet ahora mismo. Podés seguir vendiendo: las ventas se guardan y se envían solas
              cuando vuelva la conexión.
            </p>
            <CallToActionLink href="/vender" className="mt-6">
              Ir a vender
            </CallToActionLink>
          </div>
        </div>
      </div>
    </div>
  );
}
