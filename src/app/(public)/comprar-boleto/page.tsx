import type { Metadata } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import { CompraBoletoForm } from "@/components/comprar/CompraBoletoForm";

export const metadata: Metadata = {
  title: "Comprar boleto",
  description: "Compra tu boleto digital para el XXXIV CICOM, Ciclo de Conferencias Médicas.",
};

export default async function ComprarBoletoPage() {
  // Stripe Elements necesita que window.Stripe ya exista antes de llamar
  // loadStripe() en el cliente. Se precarga aquí, con el nonce de esta
  // respuesta, en vez de dejar que @stripe/stripe-js inyecte su propio
  // <script> sin nonce (BRIEF.md: "leer el nonce desde headers() y pasarlo
  // al <script nonce={...}>"). loadStripe() detecta window.Stripe existente
  // y no vuelve a inyectar nada.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <div className="mx-auto max-w-xl px-4 pb-40 pt-12 sm:pb-12">
      <Script src="https://js.stripe.com/v3/" nonce={nonce} />
      <h1 className="text-3xl font-bold tracking-tight text-white">Comprar boleto</h1>
      <p className="mt-2 text-slate-300">
        Boleto digital para el XXXIV CICOM. Pagos en modo de prueba mientras se completa la
        verificación fiscal del comité con Stripe.
      </p>
      <div className="mt-8">
        <CompraBoletoForm />
      </div>
    </div>
  );
}
