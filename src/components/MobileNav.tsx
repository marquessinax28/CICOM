"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const ENLACES = [
  { href: "/programas", label: "Programas" },
  { href: "/concursos", label: "Concursos" },
  { href: "/sedes", label: "Sedes" },
  { href: "/historico", label: "Histórico" },
  { href: "/contacto", label: "Contacto" },
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
      <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-md border border-slate-300 [&::-webkit-details-marker]:hidden dark:border-slate-700">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </summary>
      <nav className="absolute right-0 top-full mt-2 flex w-48 flex-col gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-950">
        {ENLACES.map((enlace) => (
          <Link
            key={enlace.href}
            href={enlace.href}
            className="rounded-md px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {enlace.label}
          </Link>
        ))}
      </nav>
    </details>
  );
}
