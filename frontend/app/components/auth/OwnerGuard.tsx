"use client";

import { useEffect, useState } from "react";
import { fetchCurrentUser } from "@/features/auth/api";
import { Card, PageHeader, Skeleton } from "../ui/SharedControls";

/* OwnerGuard: solo DUENO. 401 → api-client ya redirige a /login (render nada).
   403 u otro rol → tarjeta "Solo dueño" con vuelta a /dashboard. */
export default function OwnerGuard({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<"loading" | "ok" | "denied" | "unauthorized">("loading");

  useEffect(() => {
    fetchCurrentUser()
      .then((me) => {
        setEstado(me.rol === "DUENO" ? "ok" : "denied");
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "";
        if (msg.includes("Sesión vencida")) {
          setEstado("unauthorized");
          return;
        }
        setEstado("denied");
      });
  }, []);

  if (estado === "loading") return <Skeleton className="h-40 w-full" />;
  if (estado === "unauthorized") return null;
  if (estado === "denied") {
    return (
      <Card>
        <PageHeader
          title="Solo dueño"
          hint="Esta sección es solo para el dueño del negocio. Pedile que entre con su cuenta."
        />
        <a
          href="/dashboard"
          className="press mt-4 inline-block rounded-action bg-tienda-700 px-5 py-3 font-extrabold text-white shadow-pop hover:bg-tienda-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700 focus-visible:ring-offset-2"
        >
          Volver al inicio
        </a>
      </Card>
    );
  }
  return <>{children}</>;
}
