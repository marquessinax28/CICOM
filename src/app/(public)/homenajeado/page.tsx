import type { Metadata } from "next";
import { getEdicionActual } from "@/lib/queries/ediciones";
import { PlaceholderImage } from "@/components/PlaceholderImage";

export const metadata: Metadata = {
  title: "Profesor(a) homenajeado(a)",
  description: "Profesor(a) homenajeado(a) de esta edición del CICOM.",
};

export default async function HomenajeadoPage() {
  const edicion = await getEdicionActual();
  const nombre = edicion?.homenajeado_nombre ?? "Por anunciar";

  return (
    <div className="grid md:grid-cols-2">
      {/* Texto a la izquierda, imagen grande a la derecha -- mismo criterio
          de split que la sección "Profesor homenajeado" de la home. */}
      <div className="flex flex-col justify-center px-4 py-14 sm:px-8 sm:py-20 lg:px-16">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{nombre}</h1>
        <p className="mt-2 font-medium text-dorado">
          Profesor(a) homenajeado(a) — {edicion?.nombre ?? "CICOM"}
        </p>

        <div className="mt-6 max-w-xl text-slate-300">
          {edicion?.homenajeado_bio ? (
            <p className="whitespace-pre-line">{edicion.homenajeado_bio}</p>
          ) : (
            <p className="rounded-xl border border-dashed border-white/20 p-8 text-center text-sm text-slate-400">
              Biografía y discurso próximamente.
            </p>
          )}
        </div>
      </div>

      <div className="relative min-h-72 md:min-h-[32rem]">
        <PlaceholderImage
          src={edicion?.homenajeado_foto_subpagina_url ?? edicion?.homenajeado_foto_home_url ?? null}
          alt={nombre}
          sizes="(min-width: 768px) 50vw, 100vw"
        />
      </div>
    </div>
  );
}
