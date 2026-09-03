import Image from "next/image";
import Link from "next/link";
import { MobileNav } from "@/components/MobileNav";
import { ProgramasDropdown } from "@/components/ProgramasDropdown";

const ENLACES = [
  { href: "/concursos", label: "Concursos" },
  { href: "/#sedes", label: "Sedes" },
  { href: "/historico", label: "Histórico" },
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
          {/* Tamaños +15% sobre el base (text-xs/text-lg/9px) a pedido del
              cliente. */}
          <span className="font-serif-logo">
            <span className="block text-[0.8625rem] font-semibold tracking-wide text-slate-300">
              XXXIV
            </span>
            <span className="-mt-0.5 block text-[1.29375rem] font-extrabold leading-none tracking-tight text-white">
              CICOM
            </span>
            <span className="mt-1 block text-[10.35px] font-medium uppercase tracking-wider text-slate-400">
              Ciclo de Conferencias Médicas
            </span>
          </span>
        </Link>

        <nav className="ml-10 hidden flex-1 items-center justify-between text-base font-semibold text-slate-300 md:flex lg:ml-16">
          <ProgramasDropdown />
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

        <div className="hidden shrink-0 items-center gap-3 md:flex">
          <Link
            href="/activar-boleto"
            className="whitespace-nowrap rounded-full border border-white/25 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-dorado hover:text-dorado"
          >
            Activar boleto
          </Link>
          <Link
            href="/comprar-boleto"
            className="whitespace-nowrap rounded-full bg-dorado px-5 py-2.5 text-sm font-semibold text-navy transition-opacity hover:opacity-90"
          >
            Comprar boleto
          </Link>
        </div>

        <MobileNav />
      </div>
    </header>
  );
}
