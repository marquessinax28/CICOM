import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { consultarConReintento } from "@/lib/supabase/retry";

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
  try {
    await consultarConReintento(() =>
      supabase.from("eventos_stripe_procesados").insert({ id: event.id, tipo: event.type })
    );
  } catch (error) {
    const idempotenciaError = error as { code?: string };
    if (idempotenciaError.code === "23505") {
      return NextResponse.json({ received: true, duplicado: true });
    }
    console.error("[stripe webhook] Error registrando idempotencia", error);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      try {
        // consultarConReintento absorbe el PGRST303 transitorio -- un pago
        // real que se queda sin marcar 'pagado' por un desfase de reloj de
        // la infraestructura de Supabase es justo el caso que no queremos
        // dejar en manos únicamente del reintento (más lento) de Stripe.
        const resultado = await consultarConReintento(() =>
          supabase.rpc("fn_marcar_orden_pagada", {
            p_payment_intent_id: paymentIntent.id,
            p_amount_received_centavos: paymentIntent.amount_received,
          })
        );

        // fn_marcar_orden_pagada NO lanza en el caso de monto que no
        // coincide -- si lanzara, revertiría el UPDATE a 'fallido' que la
        // función ya aplicó (una función de Postgres es una sola
        // transacción implícita). Se registra como incidente para
        // revisión humana, sin bloquear la respuesta 200 al webhook.
        const fila = resultado?.[0];
        if (fila?.estado === "fallido") {
          console.error(
            `[stripe webhook] payment_intent.succeeded ${paymentIntent.id}: monto recibido no coincide con la orden ${fila.id}, marcada fallido`
          );
        }
      } catch (error) {
        // orden_no_encontrada: sí lanza (no hay ningún UPDATE previo que
        // se pueda perder). Se registra como incidente para revisión
        // humana. Se responde 200 de todas formas -- un reintento de
        // Stripe no va a resolver que la orden no exista, y ya quedó
        // auditado en eventos_stripe_procesados.
        const rpcError = error as { message?: string };
        console.error(
          `[stripe webhook] payment_intent.succeeded ${paymentIntent.id}:`,
          rpcError.message ?? error
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
      try {
        await consultarConReintento(() =>
          supabase
            .from("ordenes_compra")
            .update({ estado: "fallido" })
            .eq("stripe_payment_intent_id", paymentIntent.id)
            .eq("estado", "pendiente")
        );
      } catch (error) {
        console.error(`[stripe webhook] ${event.type} ${paymentIntent.id}:`, error);
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
