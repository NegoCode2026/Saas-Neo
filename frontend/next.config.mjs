/** @type {import('next').NextConfig} */
const nextConfig = {
  // PWA Fase 2: next-pwa o Serwist. Por ahora solo manifest + viewport.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  // Headers de seguridad del frontend (defensa en profundidad + anti-clickjacking).
  // NOTA: NEXT_PUBLIC_* siempre queda expuesto en el bundle del navegador:
  // ahí solo va NEXT_PUBLIC_API_URL (público por diseño). NUNCA claves.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/pos", destination: "/vender", permanent: true },
      { source: "/pos/:path*", destination: "/vender/:path*", permanent: true },
      { source: "/mas", destination: "/menu", permanent: true },
      { source: "/mas/:path*", destination: "/menu/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
