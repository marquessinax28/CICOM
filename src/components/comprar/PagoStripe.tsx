"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type { Stripe } from "@stripe/stripe-js";
import { FormAlert } from "@/components/FormAlert";

type Props = {
  stripePromise: Promise<Stripe | null>;
  clientSecret: string;
};

export function PagoStripe({ stripePromise, clientSecret }: Props) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <FormularioPago />
    </Elements>
  );
}

function FormularioPago() {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  async function onSubmit(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!stripe || !elements) return;

    setEnviando(true);
    setMensajeError(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      // if_required: la mayoría de los pagos con tarjeta en modo prueba se
      // confirman sin salir de la página; solo los métodos que exigen
      // redirección (ej. algunos bancos) navegan a return_url (que ya
      // lleva ?payment_intent=... porque Stripe lo agrega él mismo en ese
      // caso, igual que se agrega a mano abajo para el camino sin
      // redirección).
      redirect: "if_required",
      confirmParams: {
        return_url: `${window.location.origin}/comprar-boleto/exito`,
      },
    });

    if (error) {
      setMensajeError(error.message ?? "No se pudo procesar el pago. Intenta de nuevo.");
      setEnviando(false);
      return;
    }

    // La página de éxito necesita el id del PaymentIntent para consultar
    // /api/comprar/estado-orden y /api/comprar/descargar-boleto -- es el
    // mismo id que stripe_payment_intent_id en ordenes_compra, con
    // suficiente entropía para no ser adivinable (ver el comentario en
    // estado-orden/route.ts).
    const destino = paymentIntent
      ? `/comprar-boleto/exito?payment_intent=${encodeURIComponent(paymentIntent.id)}`
      : "/comprar-boleto/exito";
    router.push(destino);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <PaymentElement />
      {mensajeError && <FormAlert tipo="error" mensaje={mensajeError} />}
      <button
        type="submit"
        disabled={!stripe || enviando}
        className="self-start rounded-lg bg-dorado px-6 py-2.5 text-sm font-semibold text-navy disabled:opacity-60"
      >
        {enviando ? "Procesando..." : "Pagar"}
      </button>
    </form>
  );
}
