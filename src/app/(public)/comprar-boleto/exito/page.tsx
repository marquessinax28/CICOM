import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pago recibido",
  robots: { index: false, follow: false },
};

export default function CompraExitoPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-white">¡Gracias por tu compra!</h1>
      <p className="mt-4 text-slate-300">
        Recibimos tu pago y estamos confirmándolo. En cuanto quede verificado te enviaremos tu
        boleto por correo electrónico.
      </p>
      <p className="mt-8 rounded-xl border border-dashed border-white/20 p-8 text-sm text-slate-400">
        La generación y descarga del boleto digital estará disponible próximamente.
      </p>
    </div>
  );
}
