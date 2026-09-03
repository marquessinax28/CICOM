import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Cormorant_Garamond } from "next/font/google";
import "./globals.css";

// Autohospedada por next/font (nunca un <link> a fonts.googleapis.com en
// producción -- la CSP del sitio no lo permitiría de todas formas). La
// variable se expone como --font-cormorant y se mapea a la utilidad
// `font-cormorant` en globals.css.
const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cormorant",
});

const DESCRIPCION =
  "CICOM, Ciclo de Conferencias Médicas del Antiguo Hospital Civil de Guadalajara y el Hospital Civil Nuevo Juan I. Menchaca.";

// resizes-content: cuando se abre el teclado en móvil, el navegador encoge
// el viewport de layout (no solo el visual) -- así min-h-dvh y el flujo del
// documento se recalculan y el botón de enviar no queda atrapado detrás del
// teclado. Sin esto, Chrome deja min-h-dvh calculado como si el teclado no
// existiera.
export const viewport: Viewport = {
  interactiveWidget: "resizes-content",
  // El sitio tiene un solo tema fijo (identidad de marca), nunca sigue el
  // modo claro/oscuro del sistema operativo del visitante.
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://leonesporlasalud.com.mx"),
  title: {
    default: "CICOM — Ciclo de Conferencias Médicas",
    template: "%s — CICOM",
  },
  description: DESCRIPCION,
  // ⚠️ TEMPORAL -- sitio todavía en construcción (Fase 3, sin datos reales
  // de sedes/patrocinadores/boletos). Bloquea indexación en todos los
  // buscadores para que Google/Bing no muestren una versión incompleta en
  // resultados de búsqueda antes del lanzamiento.
  // QUITAR este bloque `robots` (y volver a "allow" en src/app/robots.ts)
  // antes de salir a producción con el contenido definitivo.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  openGraph: {
    title: "CICOM — Ciclo de Conferencias Médicas",
    description: DESCRIPCION,
    url: "https://leonesporlasalud.com.mx",
    siteName: "CICOM",
    locale: "es_MX",
    type: "website",
    // Placeholder hasta tener una imagen social 1200x630 dedicada -- ver
    // reporte de contenido faltante.
    images: ["/logo-header.jpg"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalOrganization",
    name: "CICOM — Ciclo de Conferencias Médicas",
    description: DESCRIPCION,
    url: "https://leonesporlasalud.com.mx",
  };

  return (
    <html lang="es" className={cormorantGaramond.variable}>
      <body>
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
