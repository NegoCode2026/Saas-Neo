/* ProductPhonePreview (ex-"PhonePreview"): realistic product preview using
   the same UI as the app, mounted in a DoubleFrameCard with a rotated
   price tag on the side. */
export default function ProductPhonePreview() {
  return (
    <div className="relative mx-auto w-full max-w-[330px]">
      {/* Etiqueta colgante: gesto de tienda, no decoración */}
      <span
        aria-hidden="true"
        className="absolute -left-3 top-10 z-10 -rotate-6 rounded-xl border border-tienda-800/20 bg-tienda-700 px-3 py-2 font-display text-sm font-extrabold text-white shadow-pop md:-left-6"
      >
        Piloto gratis
      </span>

      <div
        role="img"
        aria-label="Vista previa de StockLocal: botón vender, productos con stock, alerta de bajo stock y ganancia del día"
        className="rounded-[2.6rem] border border-zinc-200/80 bg-white/60 p-2.5 shadow-card"
      >
        <div className="space-y-3 rounded-[2.1rem] border border-zinc-200 bg-papel p-4">
          <div className="flex items-center justify-between">
            <p className="font-display text-base font-extrabold text-tinta">Tu tienda hoy</p>
            <span className="rounded-full border border-tienda-100 bg-tienda-50 px-2 py-0.5 text-[11px] font-bold text-tienda-800">
              Al día
            </span>
          </div>

          <div className="rounded-action bg-tienda-700 p-4 shadow-pop">
            <p className="text-base font-extrabold leading-tight text-white">Vender ahora</p>
            <p className="text-xs font-medium text-white/85">Buscá, tocá +, cobrá</p>
          </div>

          <ul className="space-y-2">
            <li className="flex items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-white p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-tinta">Arroz Diana 1kg</p>
                <p className="text-xs text-zinc-500">Stock 12</p>
              </div>
              <p className="text-sm font-extrabold tabular-nums text-tinta">$3.200</p>
            </li>
            <li className="flex items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-tinta">Café Sello Rojo 500g</p>
                <p className="text-xs font-bold text-amber-800">Quedan 2 · pedilo hoy</p>
              </div>
              <p className="text-sm font-extrabold tabular-nums text-tinta">$9.800</p>
            </li>
          </ul>

          <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">Ganancia de hoy</p>
            <p className="font-display text-2xl font-extrabold tabular-nums text-tinta">$48.500</p>
          </div>
        </div>
      </div>
    </div>
  );
}
