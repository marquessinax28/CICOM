// CAMBIO 2, punto 4: "En el webhook: antes de marcar la orden como pagada,
// compara payment_intent.amount_received contra monto_centavos guardado en
// la orden. Si no coinciden, no la marques como pagada y registra el
// incidente en la auditoría. No recalcules el precio ahí."
//
// fn_marcar_orden_pagada ya hace exactamente esto (nunca recalcula --
// compara el entero guardado contra lo que Stripe confirma que cobró).
// Esta prueba lo verifica de punta a punta contra el webhook real.

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

describe("Fase 4 — webhook: monto recibido distinto al guardado en la orden", () => {
  const correo = correoDePrueba("monto-no-coincide");
  const paymentIntentId = `pi_prueba_monto_${Date.now()}`;
  const eventId = `evt_prueba_monto_no_coincide_${Date.now()}`;
  const montoEsperadoCentavos = 55000;
  const montoRecibidoCentavos = 1; // deliberadamente distinto
  let ordenId: number;

  beforeAll(async () => {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("ordenes_compra")
      .insert({
        nombre_comprador: correo,
        correo_comprador: correo,
        monto_centavos: montoEsperadoCentavos,
        estado: "pendiente",
        categoria: "general",
        precio_unitario_centavos: montoEsperadoCentavos,
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

  it("no marca la orden pagada y deja registro del evento (auditoría)", async () => {
    const evento = {
      id: eventId,
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: paymentIntentId,
          amount_received: montoRecibidoCentavos,
        },
      },
    };
    const rawBody = JSON.stringify(evento);
    const secret = process.env.STRIPE_WEBHOOK_SECRET!;
    const firma = Stripe.webhooks.generateTestHeaderString({ payload: rawBody, secret });

    // El webhook responde 200 igual (CLAUDE.md sección 5: un reintento de
    // Stripe no va a resolver un desajuste de monto) -- lo que importa es
    // el estado de la orden, no el código de respuesta.
    const respuesta = await POST(requestConFirma(rawBody, firma));
    expect(respuesta.status).toBe(200);

    const supabase = createServiceRoleClient();
    const { data: orden } = await supabase
      .from("ordenes_compra")
      .select("estado, monto_centavos")
      .eq("id", ordenId)
      .single();

    // Nunca "pagado" con un monto que no coincide, y monto_centavos sigue
    // siendo el original -- fn_marcar_orden_pagada nunca recalcula el
    // precio, solo compara.
    expect(orden!.estado).not.toBe("pagado");
    expect(orden!.estado).toBe("fallido");
    expect(orden!.monto_centavos).toBe(montoEsperadoCentavos);

    // Auditoría: el evento queda registrado en eventos_stripe_procesados
    // aunque la orden no se haya marcado pagada -- no se pierde el rastro
    // del incidente.
    const { data: eventoRegistrado } = await supabase
      .from("eventos_stripe_procesados")
      .select("id")
      .eq("id", eventId)
      .maybeSingle();

    expect(eventoRegistrado).not.toBeNull();
  });
});

// Prueba de regresión dedicada -- bug real encontrado al escribir la
// prueba de arriba (no por inspección): fn_marcar_orden_pagada hacía
// `update ... set estado = 'fallido'` y LUEGO `raise exception
// 'monto_no_coincide'`. Una función de Postgres es una sola transacción
// implícita: lanzar una excepción deshace todo lo hecho en la llamada,
// incluido ese UPDATE. Efecto real: la orden se quedaba en 'pendiente'
// para siempre (nunca pasaba a 'fallido'), y como el event.id ya había
// quedado registrado en eventos_stripe_procesados ANTES de llamar la
// función (para idempotencia), un reintento de Stripe con el mismo evento
// nunca volvía a intentar la reconciliación -- el desajuste quedaba
// huérfano en 'pendiente' sin que nada lo volviera a tocar.
//
// Corregido en la migración 20260903090700: la función ya no relanza en
// este caso -- regresa el estado resultante como fila normal, así el
// UPDATE que la precede sí persiste.
//
// Esta prueba existe SOLO para proteger esa diferencia exacta: "distinto
// de pagado" no es suficiente (pendiente también lo cumple, y pendiente
// fue el bug real) -- tiene que ser 'fallido' específicamente.
describe("Fase 4 — regresión: orden con monto no coincidente debe quedar 'fallido', no 'pendiente'", () => {
  const correo = correoDePrueba("regresion-fallido");
  const paymentIntentId = `pi_prueba_regresion_${Date.now()}`;
  const eventId = `evt_prueba_regresion_fallido_${Date.now()}`;
  const montoEsperadoCentavos = 65000;
  const montoRecibidoCentavos = 1;
  let ordenId: number;

  beforeAll(async () => {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("ordenes_compra")
      .insert({
        nombre_comprador: correo,
        correo_comprador: correo,
        monto_centavos: montoEsperadoCentavos,
        estado: "pendiente",
        categoria: "general",
        precio_unitario_centavos: montoEsperadoCentavos,
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

  it("pasa de 'pendiente' a 'fallido' -- nunca se queda huérfana en 'pendiente'", async () => {
    const evento = {
      id: eventId,
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: paymentIntentId,
          amount_received: montoRecibidoCentavos,
        },
      },
    };
    const rawBody = JSON.stringify(evento);
    const secret = process.env.STRIPE_WEBHOOK_SECRET!;
    const firma = Stripe.webhooks.generateTestHeaderString({ payload: rawBody, secret });

    await POST(requestConFirma(rawBody, firma));

    const supabase = createServiceRoleClient();
    const { data: orden } = await supabase
      .from("ordenes_compra")
      .select("estado")
      .eq("id", ordenId)
      .single();

    // El chequeo que importa: NO "estado !== 'pagado'" (pendiente también
    // lo cumple, y pendiente fue exactamente el bug). Tiene que haber
    // transicionado a 'fallido' de verdad.
    expect(orden!.estado).not.toBe("pendiente");
    expect(orden!.estado).toBe("fallido");
  });
});
