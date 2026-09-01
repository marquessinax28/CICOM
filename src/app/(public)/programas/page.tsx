import type { Metadata } from "next";
import { getModulos } from "@/lib/queries/modulos";
import { getCursosTalleres } from "@/lib/queries/cursos-talleres";
import { getConcursos } from "@/lib/queries/concursos";
import { PlaceholderImage } from "@/components/PlaceholderImage";
import { ProgramasBuscador, type ItemBuscable } from "@/components/ProgramasBuscador";

export const metadata: Metadata = {
  title: "Programas",
  description: "Módulos, cursos y talleres del CICOM. Búscalos por nombre.",
};

export default async function ProgramasPage() {
  const [modulos, cursosTalleres, concursos] = await Promise.all([
    getModulos(),
    getCursosTalleres(),
    getConcursos(),
  ]);

  const items: ItemBuscable[] = [
    ...modulos.map((m) => ({
      id: `modulo-${m.id}`,
      tipo: "Módulo" as const,
      nombre: m.nombre,
      // Hoy especialidad === nombre para los módulos (son especialidades
      // directamente) -- no repetir el mismo texto como subtítulo.
      subtitulo: m.especialidad !== m.nombre ? m.especialidad : null,
      accion: m.archivo_pdf_url
        ? ({ kind: "externo", href: m.archivo_pdf_url } as const)
        : ({ kind: "scroll", targetId: `modulo-${m.id}` } as const),
    })),
    ...cursosTalleres.map((c) => ({
      id: `curso-${c.id}`,
      tipo: "Curso o taller" as const,
      nombre: c.nombre,
      accion: c.archivo_url
        ? ({ kind: "externo", href: c.archivo_url } as const)
        : ({ kind: "scroll", targetId: `curso-${c.id}` } as const),
    })),
    ...concursos.map((c) => ({
      id: `concurso-${c.id}`,
      tipo: "Concurso" as const,
      nombre: c.nombre,
      accion: { kind: "interno", href: `/concursos/${c.slug}` } as const,
    })),
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-white">Programas</h1>
      <p className="mt-2 text-slate-300">
        Módulos, cursos y talleres del congreso.
      </p>

      <div className="mt-8 max-w-xl">
        <ProgramasBuscador items={items} />
      </div>

      <section id="modulos" className="mt-10 scroll-mt-24">
        <h2 className="text-xl font-semibold text-white">Módulos ({modulos.length})</h2>
        <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 md:grid-cols-4">
          {modulos.map((modulo) => (
            <li
              key={modulo.id}
              id={`modulo-${modulo.id}`}
              className="scroll-mt-24 flex flex-col items-center text-center"
            >
              {modulo.archivo_pdf_url ? (
                <a href={modulo.archivo_pdf_url} target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center">
                  <div className="relative mb-4 h-24 w-24 overflow-hidden rounded-2xl transition-transform group-hover:scale-105 sm:h-28 sm:w-28">
                    <PlaceholderImage src={modulo.icono_url} alt="" sizes="112px" />
                  </div>
                  <p className="text-lg font-bold leading-snug text-white">{modulo.nombre}</p>
                  {modulo.especialidad && modulo.especialidad !== modulo.nombre && (
                    <p className="mt-1 text-sm text-slate-400">
                      {modulo.especialidad}
                    </p>
                  )}
                </a>
              ) : (
                <div className="group flex flex-col items-center">
                  <div className="relative mb-4 h-24 w-24 overflow-hidden rounded-2xl transition-transform group-hover:scale-105 sm:h-28 sm:w-28">
                    <PlaceholderImage src={modulo.icono_url} alt="" sizes="112px" />
                  </div>
                  <p className="text-lg font-bold leading-snug text-white">{modulo.nombre}</p>
                  {modulo.especialidad && modulo.especialidad !== modulo.nombre && (
                    <p className="mt-1 text-sm text-slate-400">
                      {modulo.especialidad}
                    </p>
                  )}
                  <p className="mt-2 text-xs italic text-slate-500">
                    PDF próximamente
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section id="cursos-talleres" className="mt-12 scroll-mt-24">
        <h2 className="text-xl font-semibold text-white">Cursos y talleres</h2>
        {cursosTalleres.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-white/20 p-8 text-center text-sm text-slate-400">
            Se publicarán próximamente.
          </p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {cursosTalleres.map((curso) => (
              <li key={curso.id} id={`curso-${curso.id}`} className="scroll-mt-24 rounded-xl transition-shadow">
                {curso.archivo_url ? (
                  <a
                    href={curso.archivo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:border-dorado/40"
                  >
                    <p className="text-sm font-semibold leading-snug text-white">{curso.nombre}</p>
                  </a>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm font-semibold leading-snug text-white">{curso.nombre}</p>
                    <p className="mt-2 text-xs italic text-slate-500">
                      Próximamente
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
