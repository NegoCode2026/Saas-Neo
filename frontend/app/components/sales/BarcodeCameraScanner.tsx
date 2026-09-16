"use client";

import { useEffect, useRef, useState } from "react";

/* BarcodeCameraScanner (ex-"BarcodeScanner"): camera barcode scanner.
   Uses ZXing (not BarcodeDetector) so it also works on iOS Safari.
   Camera is always released on close/unmount. Continuous mode stays open
   and debounces re-reads of the same code for 2.5s. */
export default function BarcodeCameraScanner({
  onDetect,
  onClose,
  title = "Escanear código",
  continuo = false,
  pie,
}: {
  onDetect: (code: string) => void;
  onClose: () => void;
  title?: string;
  continuo?: boolean;
  pie?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;
  const continuoRef = useRef(continuo);
  continuoRef.current = continuo;
  const ultimoRef = useRef({ code: "", at: 0 });
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);
  const [leidos, setLeidos] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          videoRef.current!,
          (result) => {
            if (!result || cancelled) return;
            const code = result.getText();
            if (continuoRef.current) {
              const ahora = Date.now();
              if (code === ultimoRef.current.code && ahora - ultimoRef.current.at < 2500) return;
              ultimoRef.current = { code, at: ahora };
              setLeidos((n) => n + 1);
            } else {
              cancelled = true;
            }
            try {
              navigator.vibrate?.(80);
            } catch {
              /* sin vibración disponible */
            }
            onDetectRef.current(code);
            if (!continuoRef.current) controls.stop();
          }
        );
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setListo(true);
      } catch {
        setError("No pudimos abrir la cámara. Revisá los permisos del navegador.");
      }
    })();
    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
    // onDetect va por ref: si estuviera en deps, cada render del padre
    // reiniciaría la cámara.
  }, []);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex flex-col bg-tinta"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <p className="font-display font-extrabold text-papel">{title}</p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Cerrar escáner"
          className="press rounded-full p-3 text-papel hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-40 w-72 max-w-[80vw] rounded-2xl border-2 border-white/85 shadow-[0_0_0_100vmax_rgba(11,13,18,0.5)]" />
        </div>
        {!listo && !error && (
          <p className="absolute inset-x-0 bottom-6 text-center text-sm font-bold text-papel" role="status">
            Abriendo cámara…
          </p>
        )}
        {error && (
          <div className="absolute inset-x-4 bottom-6 rounded-2xl bg-white p-4" role="alert">
            <p className="text-sm font-bold text-peligro">{error}</p>
          </div>
        )}
      </div>

      <p className="px-4 py-4 text-center text-xs font-medium text-papel/80">
        {pie ?? "Apuntá al código de barras. Soporta EAN, UPC y Code-128."}
        {continuo && leidos > 0 && ` · ${leidos} leído${leidos === 1 ? "" : "s"}`}
      </p>
    </div>
  );
}
