import type { Metadata } from "next";
import { getSedes } from "@/lib/queries/sedes";
import { PlaceholderImage } from "@/components/PlaceholderImage";

export const metadata: Metadata = {
  title: "Sedes",
  description: "Ubicaciones del CICOM: Antiguo Hospital Civil y Hospital Civil Nuevo, Guadalajara.",
};

export default async function SedesPage() {
  const sedes = await getSedes();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Sedes</h1>
      <p className="mt-2 text-slate-600">
        Ubicaciones donde se llevará a cabo el congreso.
      </p>

      {sedes.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Las sedes se publicarán próximamente.
        </p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {sedes.map((sede) => (
            <div key={sede.id} className="overflow-hidden rounded-xl border border-slate-200">
              <div className="relative aspect-video">
                <PlaceholderImage
                  src={sede.imagen_url}
                  alt={sede.nombre}
                  sizes="(min-width: 640px) 50vw, 100vw"
                />
              </div>
              <div className="p-5">
                <h2 className="font-semibold">{sede.nombre}</h2>
                {sede.direccion && (
                  <p className="mt-1 text-sm text-slate-600">{sede.direccion}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
