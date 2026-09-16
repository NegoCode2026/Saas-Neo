"use client";

import { useEffect, useState } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/* InstallAppButton (ex-"InstallPWA"): "Install app" button, visible only
   when the browser allows it (beforeinstallprompt). On iOS (no event)
   it shows manual install instructions instead. */
export default function InstallAppButton() {
  const [evento, setEvento] = useState<BIPEvent | null>(null);
  const [instalada, setInstalada] = useState(false);
  const [esIOS, setEsIOS] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalada(true);
      return;
    }
    setEsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onBIP = (e: Event) => {
      e.preventDefault();
      setEvento(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalada(true);
      setEvento(null);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (instalada) return null;

  if (evento) {
    return (
      <button
        type="button"
        onClick={async () => {
          await evento.prompt();
          const { outcome } = await evento.userChoice;
          if (outcome === "accepted") setEvento(null);
        }}
        className="press w-full rounded-2xl border border-tienda-700 bg-tienda-50 p-4 text-left hover:bg-tienda-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700"
      >
        <span className="block font-extrabold text-tienda-900">Instalar StockLocal en tu celular</span>
        <span className="block text-sm font-medium text-tienda-800">Abre como app, funciona sin internet.</span>
      </button>
    );
  }

  if (esIOS) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <p className="font-extrabold text-tinta">Llevala en tu iPhone</p>
        <p className="mt-1 text-sm text-zinc-600">
          Tocá Compartir y después “Agregar a inicio” para usarla como app, incluso sin internet.
        </p>
      </div>
    );
  }

  return null;
}
