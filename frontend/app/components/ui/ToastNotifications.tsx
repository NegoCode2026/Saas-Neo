"use client";

import { useEffect, useState } from "react";

/* ToastNotifications (ex-"Toasts"): dependency-free toasts — in-memory store
   + CSS transitions (never keyframes on frequently-fired elements).
   Same enter/exit path (rise + fade). Max 3 stacked. */

export type ToastTone = "ok" | "error" | "info";
type Toast = { id: number; msg: string; tone: ToastTone };

let seq = 0;
let items: Toast[] = [];
const subs = new Set<(ts: Toast[]) => void>();

function emit() {
  subs.forEach((fn) => fn([...items]));
}

export function toast(msg: string, tone: ToastTone = "ok") {
  items = [...items.slice(-2), { id: ++seq, msg, tone }];
  emit();
}

function removeToast(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

const tones: Record<ToastTone, string> = {
  ok: "bg-tinta text-white",
  error: "bg-red-600 text-white",
  info: "border border-zinc-200 bg-white text-tinta",
};

function ToastItem({ t }: { t: Toast }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const r = requestAnimationFrame(() => setShow(true));
    const t1 = setTimeout(() => setShow(false), 2700);
    const t2 = setTimeout(() => removeToast(t.id), 2950);
    return () => {
      cancelAnimationFrame(r);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [t.id]);

  return (
    <div
      role={t.tone === "error" ? "alert" : "status"}
      className={`pointer-events-auto w-full rounded-2xl px-4 py-3 text-sm font-bold shadow-card transition-[transform,opacity] duration-200 ease-out ${
        tones[t.tone]
      } ${show ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
    >
      {t.msg}
    </div>
  );
}

export default function ToastNotifications() {
  const [list, setList] = useState<Toast[]>([]);

  useEffect(() => {
    subs.add(setList);
    setList([...items]);
    return () => {
      subs.delete(setList);
    };
  }, []);

  if (list.length === 0) return null;
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 mx-auto flex w-full max-w-md flex-col items-stretch gap-2 px-4 lg:bottom-8"
    >
      {list.map((t) => (
        <ToastItem key={t.id} t={t} />
      ))}
    </div>
  );
}
