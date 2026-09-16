/* AppIcons (ex-"icons"): inline system iconography — simple geometric glyphs.
   No external libs: the PWA must stay light on flaky data connections.
   Single stroke per icon, same width, one visual family. */

export type IconName =
  | "home"
  | "grid"
  | "box"
  | "plus"
  | "cart"
  | "history"
  | "chart"
  | "users"
  | "truck"
  | "bell"
  | "cash"
  | "receipt"
  | "calendar"
  | "clipboard"
  | "logout";

const PATHS: Record<IconName, string> = {
  home: "M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5M9 21v-6h6v6",
  grid: "M3.5 3.5h7v7h-7zM13.5 3.5h7v7h-7zM3.5 13.5h7v7h-7zM13.5 13.5h7v7h-7z",
  box: "M12 2.5 21 7v10l-9 4.5L3 17V7zM3 7l9 4.5L21 7M12 11.5V21.5",
  plus: "M12 5v14M5 12h14",
  cart: "M3 4h2l2.4 12.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20.5 8H6M10 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  history: "M3.5 12a8.5 8.5 0 1 1 2.5 6M3.5 12H7M3.5 12V8.5M12 7.5V12l3 2",
  chart: "M4 20V10M10 20V4M16 20v-7M21 20H3",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  truck: "M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  bell: "M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M10.3 21a2 2 0 0 0 3.4 0",
  cash: "M2.5 7.5h19v9h-19zM12 9.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8zM5.5 12h.01M18.5 12h.01",
  receipt: "M6 3h12v18l-3-1.7-3 1.7-3-1.7L6 21zM9 8h6M9 12h6M9 16h3",
  calendar: "M4 5.5h16v15H4zM4 9.5h16M8 3v4M16 3v4",
  clipboard: "M9 4h6v3H9zM6 5H5v16h14V5h-1M9.5 14l2 2 4-4.5",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
};

export function Icon({
  name,
  active = false,
  className = "h-5 w-5",
}: {
  name: IconName;
  active?: boolean;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
