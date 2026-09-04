import type { Metadata } from "next";
import { getComiteOrganizador } from "@/lib/queries/comite";
import { PlaceholderImage } from "@/components/PlaceholderImage";

export const metadata: Metadata = {
  title: "Comité Organizador",
  description: "Comité organizador del XXXIV CICOM.",
};

export default async function ComiteOrganizadorPage() {
  const comite = await getComiteOrganizador();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Comité Organizador
      </h1>
      <p className="mt-2 text-slate-300">XXXIV CICOM</p>

      {comite.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-white/20 p-8 text-center text-sm text-slate-400">
          Se publicará próximamente.
        </p>
      ) : (
        // Lista vertical, uno debajo de otro, en el mismo orden en que el
        // comité los entregó (getComiteOrganizador ordena por id ascendente,
        // que refleja ese orden porque scripts/seed-content.ts los inserta
        // en ese mismo orden). Separación amplia entre cada uno (gap-16 ≈
        // dos renglones de texto) más una línea gris sutil de por medio
        // (divide-y), a pedido del cliente.
        <ul className="mt-10 flex flex-col gap-16 divide-y divide-white/10 border-t border-white/10">
          {comite.map((miembro) => (
            <li key={miembro.id} className="flex items-center gap-6">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full sm:h-32 sm:w-32">
                <PlaceholderImage src={miembro.foto_url} alt={miembro.nombre} sizes="128px" />
              </div>
              <div>
                <p className="text-2xl font-bold leading-snug text-white">{miembro.nombre}</p>
                {miembro.cargo && (
                  <p className="mt-1 text-base font-medium text-dorado">{miembro.cargo}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
