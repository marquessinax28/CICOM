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
      subtitulo: m.especialidad,
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
      <h1 className="text-3xl font-bold tracking-tight">Programas</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        Módulos, cursos y talleres del congreso.
      </p>

      <div className="mt-8 max-w-xl">
        <ProgramasBuscador items={items} />
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Módulos ({modulos.length})</h2>
        <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {modulos.map((modulo) => (
            <li key={modulo.id} id={`modulo-${modulo.id}`} className="scroll-mt-24 rounded-xl transition-shadow">
              {modulo.archivo_pdf_url ? (
                <a
                  href={modulo.archivo_pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl border border-slate-200 p-4 hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
                >
                  <div className="relative mb-3 h-10 w-10 overflow-hidden rounded-lg">
                    <PlaceholderImage src={modulo.icono_url} alt="" sizes="40px" />
                  </div>
                  <p className="text-sm font-semibold leading-snug">{modulo.nombre}</p>
                  {modulo.especialidad && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {modulo.especialidad}
                    </p>
                  )}
                </a>
              ) : (
                <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="relative mb-3 h-10 w-10 overflow-hidden rounded-lg">
                    <PlaceholderImage src={modulo.icono_url} alt="" sizes="40px" />
                  </div>
                  <p className="text-sm font-semibold leading-snug">{modulo.nombre}</p>
                  {modulo.especialidad && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {modulo.especialidad}
                    </p>
                  )}
                  <p className="mt-2 text-xs italic text-slate-400 dark:text-slate-500">
                    PDF próximamente
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Cursos y talleres</h2>
        {cursosTalleres.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
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
                    className="block rounded-xl border border-slate-200 p-4 hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-600"
                  >
                    <p className="text-sm font-semibold leading-snug">{curso.nombre}</p>
                  </a>
                ) : (
                  <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <p className="text-sm font-semibold leading-snug">{curso.nombre}</p>
                    <p className="mt-2 text-xs italic text-slate-400 dark:text-slate-500">
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
