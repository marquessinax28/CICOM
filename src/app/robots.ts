import type { MetadataRoute } from "next";

// ⚠️ TEMPORAL -- sitio todavía en construcción (Fase 3, sin datos reales de
// sedes/patrocinadores/boletos). `disallow: "/"` evita que los buscadores
// rastreen el sitio mientras está incompleto; la etiqueta `robots: noindex`
// en src/app/layout.tsx hace el trabajo real de bloquear la indexación.
//
// ANTES DEL LANZAMIENTO REAL:
//   1. Quitar el bloque `robots` de src/app/layout.tsx.
//   2. Cambiar el `disallow` de abajo por `allow: "/"` (con
//      `disallow: ["/admin", "/api"]` como antes) para permitir el rastreo.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
    sitemap: "https://leonesporlasalud.com.mx/sitemap.xml",
  };
}
