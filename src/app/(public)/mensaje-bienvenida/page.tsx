import type { Metadata } from "next";
import { getEdicionActual } from "@/lib/queries/ediciones";
import { PlaceholderImage } from "@/components/PlaceholderImage";

export const metadata: Metadata = {
  title: "Mensaje de bienvenida",
  description: "Mensaje de bienvenida del XXXIV CICOM.",
};

export default async function MensajeBienvenidaPage() {
  const edicion = await getEdicionActual();
  const nombre = edicion?.bienvenida_autor_nombre ?? "Por anunciar";

  return (
    // Mismo layout que /homenajeado (texto a la izquierda, imagen a la
    // derecha) -- misma estructura, solo cambian los campos de la edición
    // (bienvenida_* en vez de homenajeado_*).
    <div className="grid md:grid-cols-2">
      <div className="flex flex-col justify-center px-4 py-14 sm:px-8 sm:py-20 lg:px-16">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{nombre}</h1>
        <p className="mt-2 font-medium text-dorado">
          Mensaje de bienvenida — {edicion?.nombre ?? "CICOM"}
        </p>

        <div className="mt-6 max-w-xl text-slate-300">
          {edicion?.bienvenida_mensaje ? (
            <p className="whitespace-pre-line">{edicion.bienvenida_mensaje}</p>
          ) : (
            <p className="rounded-xl border border-dashed border-white/20 p-8 text-center text-sm text-slate-400">
              Mensaje próximamente.
            </p>
          )}
        </div>
      </div>

      <div className="relative min-h-72 md:min-h-[32rem]">
        <PlaceholderImage
          src={edicion?.bienvenida_autor_foto_url ?? null}
          alt={nombre}
          sizes="(min-width: 768px) 50vw, 100vw"
        />
      </div>
    </div>
  );
}
