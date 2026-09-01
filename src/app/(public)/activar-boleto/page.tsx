import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Activar boleto",
  description: "Activa tu boleto físico, de beca residente o cortesía del XXXIV CICOM con tu folio y contraseña.",
};

export default function ActivarBoletoPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-white">Activar boleto</h1>
      <p className="mt-2 text-slate-300">
        La activación de boletos físicos, de beca residente y de cortesía estará disponible
        próximamente.
      </p>

      <p className="mt-8 rounded-xl border border-dashed border-white/20 p-8 text-center text-sm text-slate-400">
        Vuelve pronto para activar tu boleto con tu folio y contraseña.
      </p>
    </div>
  );
}
