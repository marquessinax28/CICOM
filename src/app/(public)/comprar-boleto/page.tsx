import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Comprar boleto",
  description: "Compra tu boleto digital para el XXXIV CICOM, Ciclo de Conferencias Médicas.",
};

export default function ComprarBoletoPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-white">Comprar boleto</h1>
      <p className="mt-2 text-slate-300">
        La compra de boletos en línea estará disponible próximamente.
      </p>

      <p className="mt-8 rounded-xl border border-dashed border-white/20 p-8 text-center text-sm text-slate-400">
        Vuelve pronto para adquirir tu boleto digital.
      </p>
    </div>
  );
}
