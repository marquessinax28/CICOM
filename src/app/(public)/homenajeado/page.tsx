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
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="relative mx-auto h-56 w-56 overflow-hidden rounded-full">
        <PlaceholderImage
          src={edicion?.homenajeado_foto_subpagina_url ?? edicion?.homenajeado_foto_home_url ?? null}
          alt={nombre}
          sizes="224px"
        />
      </div>

      <h1 className="mt-6 text-center text-3xl font-bold tracking-tight">{nombre}</h1>
      <p className="mt-1 text-center text-sm text-slate-500">
        Profesor(a) homenajeado(a) — {edicion?.nombre ?? "CICOM"}
      </p>

      <div className="mt-8">
        {edicion?.homenajeado_bio ? (
          <p className="whitespace-pre-line text-slate-700">
            {edicion.homenajeado_bio}
          </p>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            Biografía y discurso próximamente.
          </p>
        )}
      </div>
    </div>
  );
}
