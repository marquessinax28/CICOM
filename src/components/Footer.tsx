import Image from "next/image";
import Link from "next/link";

const ENLACES = [
  { href: "/", label: "Inicio" },
  { href: "/sedes", label: "Sedes" },
  { href: "/contacto", label: "Contacto" },
  { href: "/historico", label: "Histórico" },
];

// Tiles con fondo azul marino "horneado" en el JPG -- por eso el fondo del
// footer es claro (slate-50), para que las marcas oscuras tengan contraste.
const MARCAS = [
  { src: "/footer-logos/cicom.jpg", alt: "XXXIV CICOM" },
  { src: "/footer-logos/leones-hospital-civil.jpg", alt: "Leones Hospital Civil" },
  { src: "/footer-logos/leones-unidad-jim.jpg", alt: "Leones Unidad JIM" },
  { src: "/footer-logos/leonas-leones-internxs.jpg", alt: "Leonas Leones Internxs" },
  { src: "/footer-logos/leones-leonas-salud.jpg", alt: "Leones Leonas por la Salud" },
  { src: "/footer-logos/hospital-civil.jpg", alt: "Hospital Civil de Guadalajara" },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-center gap-3">
          {MARCAS.map((marca) => (
            <Image
              key={marca.src}
              src={marca.src}
              alt={marca.alt}
              width={2000}
              height={2000}
              className="h-11 w-11 rounded-md object-cover"
            />
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} CICOM — Ciclo de Conferencias Médicas.</p>
          <nav className="flex flex-wrap gap-4">
            {ENLACES.map((enlace) => (
              <Link key={enlace.href} href={enlace.href} className="hover:text-navy">
                {enlace.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
