import type { Metadata } from "next";
import { getEdicionesHistoricas } from "@/lib/queries/ediciones";

export const metadata: Metadata = {
  title: "Histórico",
  description: "Ediciones anteriores del CICOM.",
};

export default async function HistoricoPage() {
  const ediciones = await getEdicionesHistoricas();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Histórico</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        Ediciones anteriores del Ciclo de Conferencias Médicas.
      </p>

      {ediciones.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Todavía no hay ediciones anteriores registradas.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-slate-200 dark:divide-slate-800">
          {ediciones.map((edicion) => (
            <li key={edicion.id} className="py-5">
              <h2 className="font-semibold">
                {edicion.nombre ?? (edicion.numero ? `Edición ${edicion.numero}` : "Edición")}
              </h2>
              {edicion.lema && (
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{edicion.lema}</p>
              )}
              {edicion.fecha_inicio && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {new Date(edicion.fecha_inicio).toLocaleDateString("es-MX", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
