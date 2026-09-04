import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!baseUrl) {
    throw new Error("Falta NEXT_PUBLIC_SITE_URL en el entorno");
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /admin -- panel administrativo, nunca debe aparecer en resultados
      // de búsqueda. /api -- rutas de servidor, incluidas las de descarga
      // de boletos (nunca contenido para indexar). /comprar-boleto/exito --
      // página de estado de una compra individual, sin valor de búsqueda y
      // sin ningún enlace público hacia ella (solo se llega vía redirect de
      // Stripe con un payment_intent en la URL).
      disallow: ["/admin", "/api", "/comprar-boleto/exito"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
