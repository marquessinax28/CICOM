import Link from "next/link";

const ITEMS = [
  { href: "/programas", label: "Programa Académico General" },
  { href: "/programas#modulos", label: "Módulos" },
  { href: "/programas#cursos-talleres", label: "Cursos y talleres" },
];

export function ProgramasDropdown() {
  return (
    <div className="group relative">
      {/* pb-3 -mb-3: el padding extiende el área "hover" del disparador
          hasta tocar el panel de abajo (sin dejar una franja muerta entre
          los dos donde el cursor perdería el :hover y el menú se cerraría
          a medio camino); el margen negativo cancela ese padding para que
          no empuje el resto del header hacia abajo. */}
      <span
        tabIndex={0}
        className="-mb-3 inline-flex cursor-default items-center gap-1 pb-3 transition-colors group-hover:text-dorado group-focus-within:text-dorado"
      >
        Programas
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
      <nav className="invisible absolute left-0 top-full z-10 flex w-60 flex-col gap-1 rounded-lg border border-white/10 bg-navy-light p-2 opacity-0 shadow-lg transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        {ITEMS.map((item, i) => (
          <Link
            key={`${item.href}-${i}`}
            href={item.href}
            className="rounded-md px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-dorado"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
