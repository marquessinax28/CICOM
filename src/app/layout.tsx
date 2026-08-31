import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

const DESCRIPCION =
  "CICOM, Ciclo de Conferencias Médicas del Antiguo Hospital Civil de Guadalajara y el Hospital Civil Nuevo Juan I. Menchaca.";

// resizes-content: cuando se abre el teclado en móvil, el navegador encoge
// el viewport de layout (no solo el visual) -- así min-h-dvh y el flujo del
// documento se recalculan y el botón de enviar no queda atrapado detrás del
// teclado. Sin esto, Chrome deja min-h-dvh calculado como si el teclado no
// existiera.
export const viewport: Viewport = {
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://leonesporlasalud.com.mx"),
  title: {
    default: "CICOM — Ciclo de Conferencias Médicas",
    template: "%s — CICOM",
  },
  description: DESCRIPCION,
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
    <html lang="es">
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
