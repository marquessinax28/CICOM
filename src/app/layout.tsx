import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://leonesporlasalud.com.mx"),
  title: {
    default: "CICOM — Ciclo de Conferencias Médicas",
    template: "%s — CICOM",
  },
  description:
    "CICOM, Ciclo de Conferencias Médicas del Antiguo Hospital Civil de Guadalajara y el Hospital Civil Nuevo Juan I. Menchaca.",
  openGraph: {
    title: "CICOM — Ciclo de Conferencias Médicas",
    description:
      "CICOM, Ciclo de Conferencias Médicas del Antiguo Hospital Civil de Guadalajara y el Hospital Civil Nuevo Juan I. Menchaca.",
    url: "https://leonesporlasalud.com.mx",
    siteName: "CICOM",
    locale: "es_MX",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
