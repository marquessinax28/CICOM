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
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-[#fffffff2] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center py-1">
          <Image
            src="/logo-header.jpg"
            alt="XXXIV CICOM — Ciclo de Conferencias Médicas"
            width={1458}
            height={895}
            priority
            className="h-10 w-auto"
          />
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-700 md:flex">
          {ENLACES.map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              className="transition-colors hover:text-navy"
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
