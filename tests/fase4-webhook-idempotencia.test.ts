// CLAUDE.md sección 14, prueba 6: "Mismo event.id de webhook dos veces → un
// solo boleto." Fase 4 todavía no genera boletos (eso es Fase 5) -- el
// efecto equivalente en esta fase es "la orden se marca pagada una sola
// vez": mandar el mismo event.id dos veces no debe reprocesar nada la
// segunda vez.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Stripe from "stripe";
import { POST } from "@/app/api/stripe/webhook/route";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { correoDePrueba, limpiarDatosDePrueba } from "./helpers";

function requestConFirma(rawBody: string, signature: string) {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": signature },
    body: rawBody,
  });
}

describe("Fase 4 — prueba 6: mismo event.id de webhook dos veces", () => {
  const correo = correoDePrueba("idempotencia");
  const paymentIntentId = `pi_prueba_${Date.now()}`;
  const eventId = `evt_prueba_idempotencia_${Date.now()}`;
  const montoCentavos = 50000;
  let ordenId: number;

  beforeAll(async () => {
    const supabase = createServiceRoleClient();

    // Orden pendiente ya "asociada" a un PaymentIntent, como quedaría tras
    // /api/comprar/crear-checkout-session -- lo que se prueba aquí es el
    // webhook, no la creación de la orden (eso lo cubre la prueba 3).
    const { data, error } = await supabase
      .from("ordenes_compra")
      .insert({
        nombre_comprador: correo,
        correo_comprador: correo,
        monto_total: montoCentavos / 100,
        estado: "pendiente",
        categoria: "general",
        precio_unitario_centavos: montoCentavos,
        stripe_payment_intent_id: paymentIntentId,
      })
      .select("id")
      .single();

    if (error) throw error;
    ordenId = data.id;
  });

  afterAll(async () => {
    await limpiarDatosDePrueba(correo);
    const supabase = createServiceRoleClient();
    await supabase.from("eventos_stripe_procesados").delete().eq("id", eventId);
  });

  it("procesa el evento la primera vez y lo descarta como duplicado la segunda", async () => {
    const evento = {
      id: eventId,
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: paymentIntentId,
          amount_received: montoCentavos,
        },
      },
    };
    const rawBody = JSON.stringify(evento);
    const secret = process.env.STRIPE_WEBHOOK_SECRET!;
    const firma = Stripe.webhooks.generateTestHeaderString({ payload: rawBody, secret });

    const primeraRespuesta = await POST(requestConFirma(rawBody, firma));
    expect(primeraRespuesta.status).toBe(200);

    const supabase = createServiceRoleClient();
    const { data: ordenTrasPrimera } = await supabase
      .from("ordenes_compra")
      .select("estado")
      .eq("id", ordenId)
      .single();
    expect(ordenTrasPrimera!.estado).toBe("pagado");

    // Mismo event.id, misma firma (Stripe reintenta el cuerpo tal cual) --
    // segunda entrega.
    const segundaRespuesta = await POST(requestConFirma(rawBody, firma));
    expect(segundaRespuesta.status).toBe(200);
    const segundoCuerpo = await segundaRespuesta.json();
    expect(segundoCuerpo.duplicado).toBe(true);

    const { data: eventosGuardados } = await supabase
      .from("eventos_stripe_procesados")
      .select("id")
      .eq("id", eventId);
    expect(eventosGuardados ?? []).toHaveLength(1);

    const { data: ordenTrasSegunda } = await supabase
      .from("ordenes_compra")
      .select("estado")
      .eq("id", ordenId)
      .single();
    expect(ordenTrasSegunda!.estado).toBe("pagado");
  });
});
