"use client";

import { useEffect } from "react";

/* ServiceWorkerSetup (ex-"ServiceWorkerRegister"): registers the service
   worker in production only (it would break HMR in dev). The offline sales
   queue works without a SW (app-level IndexedDB). */
export default function ServiceWorkerSetup() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
