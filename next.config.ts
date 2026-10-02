import path from "node:path";
import type { NextConfig } from "next";

// La raíz es esta carpeta (evita que Next tome un package-lock.json de una carpeta superior).
const raiz = path.resolve(__dirname);

const nextConfig: NextConfig = {
  // El servidor solo recibe la carpeta compilada (Guía técnica, paso 11).
  output: "standalone",
  outputFileTracingRoot: raiz,
  turbopack: { root: raiz },
  // Imágenes pequeñas y locales: sin optimizador (no escribe caché en el servidor).
  images: { unoptimized: true },
  // postgres queda como módulo aparte: lo usa también scripts/crear-admin.mjs.
  serverExternalPackages: ["postgres"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
