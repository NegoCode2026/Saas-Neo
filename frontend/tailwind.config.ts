/** @type {import('tailwindcss').Config} */
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        tienda: {
          50: "#eff6ff",
          100: "#dbeafe",
          600: "#3b82f6",
          700: "#2563eb",
          800: "#1d4ed8",
          900: "#1e40af",
        },
        papel: "#f8fafc",
        tinta: "#0b0d12",
        peligro: "#dc2626",
        aviso: "#d97706",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: {
        card: "1rem",
        action: "1.25rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(11,13,18,0.03), 0 10px 30px -16px rgba(11,13,18,0.14)",
        pop: "0 6px 18px -6px rgba(37,99,235,0.4)",
      },
      transitionTimingFunction: {
        /* ease-out fuerte para UI (animate skill) — pisa el built-in a propósito */
        out: "cubic-bezier(0.23,1,0.32,1)",
        inout: "cubic-bezier(0.77,0,0.175,1)",
        fluid: "cubic-bezier(0.32,0.72,0,1)",
      },
    },
  },
  plugins: [],
};
