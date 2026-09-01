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
// anchas y se ve el final vacío. Las dos mitades del arreglo (4 copias cada
// una) son idénticas pixel a pixel, así que translateX(-50%) siempre cae
// exactamente en el borde de una copia sin importar el ancho real de cada
// logo (ya no hay margen fijo entre ellos: van pegados uno con otro).
const REPETICIONES = 8;
const LOGOS_GALERIA = Array.from({ length: REPETICIONES }, () => MARCAS).flat();

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-navy">
      <div className="mx-auto max-w-6xl px-4 py-3">
        <div className="flex flex-col gap-1.5 text-sm">
          <nav className="flex flex-wrap gap-4 text-slate-300">
            {ENLACES.map((enlace) => (
              <Link key={enlace.href} href={enlace.href} className="hover:text-dorado">
                {enlace.label}
              </Link>
            ))}
          </nav>
          <p className="text-white">© {new Date().getFullYear()} CICOM — Ciclo de Conferencias Médicas.</p>
        </div>
      </div>

      {/* Fuera del contenedor max-w-6xl a propósito: la galería debe llegar
          de extremo a extremo de la pantalla, no quedar encajonada como el
          texto de arriba. La franja mide tan alto como se ve aquí (no el
          footer completo: la fila de texto de arriba conserva su alto
          propio) y los logos llenan ese alto de borde a borde, pegados uno
          con otro sin espacio entre ellos. */}
      <div className="h-24 overflow-hidden sm:h-28 md:h-32">
        <div className="animate-marquee flex h-full w-max items-stretch">
          {LOGOS_GALERIA.map((marca, i) => (
            <Image
              key={`${marca.src}-${i}`}
              src={marca.src}
              alt={i < MARCAS.length ? marca.alt : ""}
              aria-hidden={i >= MARCAS.length}
              width={2000}
              height={2000}
              className={`h-full w-auto shrink-0 object-contain ${
                i >= MARCAS.length ? "marquee-duplicado" : ""
              }`}
            />
          ))}
        </div>
      </div>
    </footer>
  );
}
