"use client";

import Link from "next/link";
import type { MouseEvent } from "react";

const ITEMS = [
  { href: "/comite-organizador", label: "Comité Organizador" },
  { href: "/homenajeado", label: "Profesor Homenajeado" },
  { href: "/mensaje-bienvenida", label: "Mensaje de Bienvenida" },
];

// Mismo comportamiento que ProgramasDropdown.tsx (mismo motivo documentado
// ahí: quitar el foco al hacer clic para que solo :hover decida si el menú
// sigue abierto).
function quitarFoco(e: MouseEvent<HTMLAnchorElement>) {
  e.currentTarget.blur();
}

export function ComiteDropdown() {
  return (
    <div className="group relative">
      <span
        tabIndex={0}
        className="-mb-3 inline-flex cursor-default items-center gap-1 pb-3 transition-colors group-hover:text-dorado group-focus-within:text-dorado"
      >
        Comité Organizador
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 transition-transform group-hover:rotate-180 group-focus-within:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <nav className="invisible absolute left-0 top-full z-10 flex w-64 flex-col gap-1 rounded-lg border border-white/10 bg-navy-light p-2 opacity-0 shadow-lg transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={quitarFoco}
            className="rounded-md px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-dorado"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
