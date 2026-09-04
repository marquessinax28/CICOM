import type { Metadata } from "next";
import { EstadoBoletoExito } from "@/components/comprar/EstadoBoletoExito";

export const metadata: Metadata = {
  title: "Pago recibido",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ payment_intent?: string }>;
};

export default async function CompraExitoPage({ searchParams }: Props) {
  const params = await searchParams;
  // Solo se usa para consultar el estado de ESTA compra (ver
  // EstadoBoletoExito) -- nunca se confía en él para nada que otorgue
  // acceso a datos de otra persona; estado-orden y descargar-boleto
  // vuelven a resolver la orden completa en el servidor a partir de este
  // id, no reciben ni confían en ningún otro dato del cliente.
  const paymentIntentId = params.payment_intent?.startsWith("pi_") ? params.payment_intent : null;

  return (
    <div className="mx-auto max-w-xl px-4 py-12 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-white">¡Gracias por tu compra!</h1>
      <p className="mt-4 text-slate-300">
        Recibimos tu pago y estamos confirmándolo. En cuanto quede verificado te enviaremos tu
        boleto por correo electrónico.
      </p>
      <EstadoBoletoExito paymentIntentId={paymentIntentId} />
    </div>
  );
}
