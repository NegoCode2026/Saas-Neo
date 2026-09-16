import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import ServiceWorkerSetup from "./components/pwa/ServiceWorkerSetup";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "700", "800"],
});

const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "StockLocal — Inventario simple",
  description: "Control de inventario para negocios locales",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#2563eb",
};

/* Root layout: global only (fonts, metadata, skip-link, SW).
   Authenticated shell lives in app/(staff)/layout.tsx;
   public pages render bare via app/(public)/layout.tsx. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO">
      <body className={`font-body ${display.variable} ${body.variable}`}>
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:font-bold"
        >
          Saltar al contenido
        </a>
        {children}
        <ServiceWorkerSetup />
      </body>
    </html>
  );
}
