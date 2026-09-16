import type { ReactNode } from "react";

/* SharedControls: StockLocal shared design system (ex-"ui").
   Operate mode: 1 primary green CTA per screen, everything else secondary.
   No emojis as icons. No transition:all. Only transform+opacity. */

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700 focus-visible:ring-offset-2 focus-visible:ring-offset-papel";

export function BtnPrimary({
  children,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...rest}
      className={`press w-full rounded-action bg-tienda-700 text-white p-4 text-lg font-bold hover:bg-tienda-800 active:bg-tienda-800 disabled:opacity-50 disabled:pointer-events-none shadow-pop ${focusRing} ${className}`}
    >
      {children}
    </button>
  );
}

export function BtnSecondary({
  children,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      {...rest}
      className={`press w-full rounded-action bg-white border border-zinc-300 p-4 font-semibold text-tinta hover:bg-zinc-100 active:bg-zinc-200 disabled:opacity-50 disabled:pointer-events-none ${focusRing} ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`bg-white border border-zinc-200 rounded-card p-4 shadow-card ${className}`}>
      {children}
    </section>
  );
}

export function PageHeader({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <header className="space-y-1">
      <div className="flex items-end justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-tinta">{title}</h1>
        {action}
      </div>
      {hint && <p className="text-sm text-zinc-600 max-w-[60ch]">{hint}</p>}
    </header>
  );
}

export function Field({
  label,
  htmlFor,
  helper,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  helper?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-tinta mb-1">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1 text-sm font-medium text-peligro">
          {error}
        </p>
      ) : helper ? (
        <p className="mt-1 text-xs text-zinc-500">{helper}</p>
      ) : null}
    </div>
  );
}

export const inputCls = `w-full rounded-xl border border-zinc-300 bg-white p-3 text-base text-tinta placeholder:text-zinc-400 hover:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tienda-700 focus-visible:border-tienda-700 ${""}`;

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "ok" | "warn" | "bad";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-zinc-100 text-zinc-700 border-zinc-200",
    ok: "bg-tienda-50 text-tienda-800 border-tienda-100",
    warn: "bg-amber-50 text-amber-800 border-amber-200",
    bad: "bg-red-50 text-peligro border-red-200",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-zinc-300 bg-white/60 p-6 text-center space-y-2">
      <p className="font-bold text-tinta">{title}</p>
      {hint && <p className="text-sm text-zinc-600 max-w-[40ch] mx-auto">{hint}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-zinc-200/80 ${className}`} />;
}

export function StatusMsg({ msg }: { msg: string }) {
  if (!msg) return null;
  const isErr = msg.startsWith("Error") || msg.startsWith("No se");
  return (
    <p
      role="status"
      className={`text-sm font-medium rounded-xl border p-3 ${
        isErr ? "bg-red-50 border-red-200 text-peligro" : "bg-tienda-50 border-tienda-100 text-tienda-800"
      }`}
    >
      {msg}
    </p>
  );
}

/* DoubleFrameCard (ex-"Bezel"): outer case + inner core. Gives real physical
   depth (like a mounted part) instead of a flat card on the background. */
export function DoubleFrameCard({
  children,
  className = "",
  frame = "light",
  shell,
}: {
  children: ReactNode;
  className?: string;
  frame?: "light" | "brand" | "ink";
  /** Deprecated: use `frame`. */
  shell?: "light" | "brand" | "ink";
}) {
  const tone = shell ?? frame;
  const shells: Record<string, string> = {
    light: "border-zinc-200/80 bg-white/60",
    brand: "border-tienda-800/30 bg-tienda-700/15",
    ink: "border-white/10 bg-tinta/90",
  };
  const cores: Record<string, string> = {
    light: "border-zinc-200 bg-white",
    brand: "border-tienda-100 bg-tienda-50",
    ink: "border-white/10 bg-tinta text-papel",
  };
  return (
    <div className={`rounded-[2rem] border p-2 shadow-card ${shells[tone]} ${className}`}>
      <div className={`h-full rounded-[calc(2rem-0.5rem)] border ${cores[tone]}`}>{children}</div>
    </div>
  );
}

/* Deprecated alias: use DoubleFrameCard. */
export const Bezel = DoubleFrameCard;

/* CallToActionLink (ex-"BtnCTA"): CTA with "button-in-button" — the arrow
   lives in its own circle glued to the inner edge. Slides diagonally on hover. */
export function CallToActionLink({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost" | "invert";
  className?: string;
}) {
  const variants: Record<string, string> = {
    primary: "bg-tienda-700 text-white shadow-pop hover:bg-tienda-800",
    ghost: "border border-zinc-300 bg-white text-tinta hover:bg-zinc-100",
    invert: "bg-papel text-tinta hover:bg-white",
  };
  const iconWrap: Record<string, string> = {
    primary: "bg-white/15 text-white",
    ghost: "bg-tinta/5 text-tinta",
    invert: "bg-tienda-700/10 text-tienda-800",
  };
  return (
    <a
      href={href}
      className={`press group inline-flex items-center gap-3 rounded-full py-2.5 pl-6 pr-2.5 font-bold ${variants[variant]} ${className}`}
    >
      <span>{children}</span>
      <span
        aria-hidden="true"
        className={`flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-300 ease-fluid group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${iconWrap[variant]}`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </a>
  );
}

/* Deprecated alias: use CallToActionLink. */
export const BtnCTA = CallToActionLink;
