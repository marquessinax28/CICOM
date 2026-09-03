import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/server";

// Nota sobre el cuerpo crudo: a diferencia del Pages Router antiguo (que
// necesitaba `export const config = { api: { bodyParser: false } }`), un
// Route Handler del App Router nunca parsea el cuerpo automáticamente --
// `request.text()` ya da acceso al cuerpo tal cual llegó, sin tocar. Eso es
// exactamente lo que exige la verificación de firma de Stripe.
export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[stripe webhook] Falta STRIPE_WEBHOOK_SECRET en el entorno");
    return NextResponse.json({ error: "Webhook no configurado." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Falta la firma." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error("[stripe webhook] Firma inválida", error);
    return NextResponse.json({ error: "Firma inválida." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // Idempotencia por event.id (CLAUDE.md sección 5): Stripe reintenta
  // webhooks que no respondieron 2xx a tiempo. INSERT con PK sobre event.id
  // falla con 23505 (unique_violation) en un reintento -- eso es la señal
  // de "ya procesado", sin necesidad de comparar nada más.
  const { error: idempotenciaError } = await supabase
    .from("eventos_stripe_procesados")
    .insert({ id: event.id, tipo: event.type });

  if (idempotenciaError) {
    if (idempotenciaError.code === "23505") {
      return NextResponse.json({ received: true, duplicado: true });
    }
    console.error("[stripe webhook] Error registrando idempotencia", idempotenciaError);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      const { error: rpcError } = await supabase.rpc("fn_marcar_orden_pagada", {
        p_payment_intent_id: paymentIntent.id,
        p_amount_received_centavos: paymentIntent.amount_received,
      });

      if (rpcError) {
        // orden_no_encontrada / monto_no_coincide: se registran como
        // incidente para revisión humana. Se responde 200 de todas formas
        // -- un reintento de Stripe no va a resolver ninguno de los dos
        // casos, y ya quedó auditado en eventos_stripe_procesados.
        console.error(
          `[stripe webhook] payment_intent.succeeded ${paymentIntent.id}:`,
          rpcError.message
        );
      }
      break;
    }

    case "payment_intent.payment_failed":
    case "payment_intent.canceled": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      // Actualización simple de una sola fila -- sin invariantes entre
      // filas, no necesita la función de servidor. Libera la reserva de
      // cupo (fn_reservar_orden_digital solo cuenta 'pendiente' y 'pagado').
      const { error: updateError } = await supabase
        .from("ordenes_compra")
        .update({ estado: "fallido" })
        .eq("stripe_payment_intent_id", paymentIntent.id)
        .eq("estado", "pendiente");

      if (updateError) {
        console.error(
          `[stripe webhook] ${event.type} ${paymentIntent.id}:`,
          updateError
        );
      }
      break;
    }

    default:
      // Otros eventos (ej. payment_intent.created) no requieren acción.
      break;
  }

  // ------------------------------------------------------------
  // PUNTO DE EXTENSIÓN — FASE 5 (generación de boletos digitales)
  // ------------------------------------------------------------
  // fn_marcar_orden_pagada ya deja documentado, en su propio cuerpo, dónde
  // debe engancharse la generación de folio + contraseña + envío del boleto
  // una vez que la orden queda en estado 'pagado'. Fase 4 solo registra la
  // orden -- no generar boletos todavía.
  // ------------------------------------------------------------

  return NextResponse.json({ received: true });
}
