import Image from "next/image";
import Link from "next/link";
import { MobileNav } from "@/components/MobileNav";

const ENLACES = [
  { href: "/programas", label: "Programas" },
  { href: "/concursos", label: "Concursos" },
  { href: "/sedes", label: "Sedes" },
  { href: "/historico", label: "Histórico" },
  { href: "/contacto", label: "Contacto" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy/95 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3 py-1">
          <Image
            src="/logo-header.jpg"
            alt=""
            width={1288}
            height={824}
            priority
            className="h-12 w-auto"
          />
          <span>
            <span className="block text-xs font-semibold tracking-wide text-slate-300">
              XXXIV
            </span>
            <span className="-mt-0.5 block text-lg font-extrabold leading-none tracking-tight text-white">
              CICOM
            </span>
            <span className="mt-1 block text-[9px] font-medium uppercase tracking-wider text-slate-400">
              Ciclo de Conferencias Médicas
            </span>
          </span>
        </Link>

        <nav className="ml-10 hidden flex-1 items-center justify-between text-base font-semibold text-slate-300 md:flex lg:ml-16">
          {ENLACES.map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              className="transition-colors hover:text-dorado"
            >
              {enlace.label}
            </Link>
          ))}
        </nav>

        <MobileNav />
      </div>
    </header>
  );
}
