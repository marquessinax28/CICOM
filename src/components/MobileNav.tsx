"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const PROGRAMAS_ITEMS = [
  { href: "/programas", label: "Programa Académico General" },
  { href: "/programas#modulos", label: "Módulos" },
  { href: "/programas#cursos-talleres", label: "Cursos y talleres" },
];

const COMITE_ITEMS = [
  { href: "/comite-organizador", label: "Comité Organizador" },
  { href: "/homenajeado", label: "Profesor Homenajeado" },
  { href: "/mensaje-bienvenida", label: "Mensaje de Bienvenida" },
];

const ENLACES = [
  { href: "/concursos", label: "Concursos" },
  { href: "/#sedes", label: "Sedes" },
  { href: "/historico", label: "Histórico" },
];

export function MobileNav() {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  // Next.js no vuelve a montar el layout al navegar (Link es client-side),
  // así que <details> se queda abierto mostrando el menú sobre la página
  // nueva si no lo cerramos a mano en cada cambio de ruta.
  useEffect(() => {
    if (detailsRef.current) detailsRef.current.open = false;
  }, [pathname]);

  return (
    <details ref={detailsRef} className="relative md:hidden">
      <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-md border border-white/20 text-slate-200 [&::-webkit-details-marker]:hidden">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </summary>
      <nav className="absolute right-0 top-full mt-2 flex w-56 flex-col gap-1 rounded-lg border border-white/10 bg-navy-light p-2 shadow-lg">
        <div className="mb-1 flex flex-col gap-2 border-b border-white/10 p-2 pb-3">
          <Link
            href="/activar-boleto"
            className="rounded-md border border-white/20 px-3 py-2.5 text-center text-sm font-semibold text-white hover:border-dorado hover:text-dorado"
          >
            Activar boleto
          </Link>
          <Link
            href="/comprar-boleto"
            className="rounded-md bg-dorado px-3 py-2.5 text-center text-sm font-semibold text-navy"
          >
            Comprar boleto
          </Link>
        </div>
        <p className="mt-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Programas
        </p>
        {PROGRAMAS_ITEMS.map((item, i) => (
          <Link
            key={`${item.href}-${i}`}
            href={item.href}
            className="rounded-md px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10"
          >
            {item.label}
          </Link>
        ))}

        <p className="mb-1 mt-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Comité Organizador
        </p>
        {COMITE_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10"
          >
            {item.label}
          </Link>
        ))}

        <div className="my-1 border-t border-white/10" />

        {ENLACES.map((enlace) => (
          <Link
            key={enlace.href}
            href={enlace.href}
            className="rounded-md px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10"
          >
            {enlace.label}
          </Link>
        ))}
      </nav>
    </details>
  );
}
