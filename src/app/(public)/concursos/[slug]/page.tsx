import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getConcursoBySlug, getConcursos } from "@/lib/queries/concursos";

export async function generateStaticParams() {
  const concursos = await getConcursos();
  return concursos.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const concurso = await getConcursoBySlug(slug);
  if (!concurso) return {};
  return {
    title: concurso.nombre,
    description: concurso.descripcion ?? `${concurso.nombre} — Concurso del CICOM.`,
  };
}

export default async function ConcursoDetallePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const concurso = await getConcursoBySlug(slug);
  if (!concurso) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">{concurso.nombre}</h1>

      {concurso.categoria_tags && concurso.categoria_tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {concurso.categoria_tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {concurso.descripcion ? (
        <p className="mt-6 text-slate-700">{concurso.descripcion}</p>
      ) : (
        <p className="mt-6 text-sm italic text-slate-400">
          Descripción próximamente.
        </p>
      )}

      {concurso.fecha_limite && (
        <p className="mt-4 text-sm text-slate-500">
          Fecha límite de participación:{" "}
          {new Date(concurso.fecha_limite).toLocaleDateString("es-MX", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      )}

      {concurso.archivo_bases_pdf ? (
        <a
          href={concurso.archivo_bases_pdf}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-block rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white"
        >
          Descargar bases
        </a>
      ) : (
        <p className="mt-8 text-sm italic text-slate-400">
          Bases del concurso próximamente.
        </p>
      )}
    </div>
  );
}
