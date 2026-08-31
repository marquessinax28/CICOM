import Image from "next/image";
import Link from "next/link";

const ENLACES = [
  { href: "/", label: "Inicio" },
  { href: "/sedes", label: "Sedes" },
  { href: "/contacto", label: "Contacto" },
  { href: "/historico", label: "Histórico" },
];

const MARCAS = [
  { src: "/footer-logos/cicom.jpg", alt: "XXXIV CICOM" },
  { src: "/footer-logos/leones-hospital-civil.jpg", alt: "Leones Hospital Civil" },
  { src: "/footer-logos/leones-unidad-jim.jpg", alt: "Leones Unidad JIM" },
  { src: "/footer-logos/leonas-leones-internxs.jpg", alt: "Leonas Leones Internxs" },
  { src: "/footer-logos/leones-leonas-salud.jpg", alt: "Leones Leonas por la Salud" },
  { src: "/footer-logos/hospital-civil.jpg", alt: "Hospital Civil de Guadalajara" },
];

// 8 copias seguidas (no 2): con solo 2, la tira no llega a cubrir pantallas
// anchas y se ve el final vacío. El espacio entre logos es un margen fijo
// por elemento (no `gap` del contenedor) para que translateX(-50%) caiga
// exactamente en el borde de una copia -- con `gap`, el número de espacios
// (N-1) nunca cuadra con la mitad exacta y el bucle da un salto visible.
const REPETICIONES = 8;
const LOGOS_GALERIA = Array.from({ length: REPETICIONES }, () => MARCAS).flat();

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-navy-light">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-4 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} CICOM — Ciclo de Conferencias Médicas.</p>
          <nav className="flex flex-wrap gap-4">
            {ENLACES.map((enlace) => (
              <Link key={enlace.href} href={enlace.href} className="hover:text-dorado">
                {enlace.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Fuera del contenedor max-w-6xl a propósito: la galería debe llegar
          de extremo a extremo de la pantalla, no quedar encajonada como el
          texto de arriba. */}
      <div className="mt-8 overflow-hidden pb-8">
        <div className="animate-marquee flex w-max items-center">
          {LOGOS_GALERIA.map((marca, i) => (
            <Image
              key={`${marca.src}-${i}`}
              src={marca.src}
              alt={i < MARCAS.length ? marca.alt : ""}
              aria-hidden={i >= MARCAS.length}
              width={2000}
              height={2000}
              className={`mr-12 h-12 w-12 shrink-0 object-cover ${
                i >= MARCAS.length ? "marquee-duplicado" : ""
              }`}
            />
          ))}
        </div>
      </div>
    </footer>
  );
}
