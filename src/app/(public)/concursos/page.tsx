import type { Metadata } from "next";
import Link from "next/link";
import { getConcursos } from "@/lib/queries/concursos";
import { PlaceholderImage } from "@/components/PlaceholderImage";

export const metadata: Metadata = {
  title: "Concursos",
  description: "Reto del León, Fotografías en Salud y Trabajos Libres de Cartel del CICOM.",
};

export default async function ConcursosPage() {
  const concursos = await getConcursos();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-white">Concursos</h1>
      <p className="mt-2 text-slate-300">
        Inscríbete a los concursos del congreso.
      </p>

      {concursos.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-white/20 p-8 text-center text-sm text-slate-400">
          Los concursos se publicarán próximamente.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {concursos.map((concurso) => (
            <Link
              key={concurso.id}
              href={`/concursos/${concurso.slug}`}
              className="rounded-xl border border-white/10 bg-white/5 p-5 transition-colors hover:border-dorado/40"
            >
              <div className="relative mb-3 h-10 w-10 overflow-hidden rounded-lg">
                <PlaceholderImage src={concurso.icono_url} alt="" sizes="40px" />
              </div>
              <h2 className="font-semibold text-white">{concurso.nombre}</h2>
              {concurso.categoria_tags && concurso.categoria_tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {concurso.categoria_tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {concurso.descripcion && (
                <p className="mt-2 text-sm text-slate-300">{concurso.descripcion}</p>
              )}
              {concurso.fecha_limite && (
                <p className="mt-3 text-xs text-slate-400">
                  Fecha límite:{" "}
                  {new Date(concurso.fecha_limite).toLocaleDateString("es-MX", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
