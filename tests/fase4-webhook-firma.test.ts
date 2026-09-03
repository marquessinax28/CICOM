// CLAUDE.md sección 14, prueba 5: "Webhook con firma inválida → 400, sin
// emitir boleto." (Fase 4 todavía no genera boletos -- el equivalente en
// esta fase es que la orden nunca se marque 'pagado' ni quede registrada
// como evento procesado.)

import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/stripe/webhook/route";
import { createServiceRoleClient } from "@/lib/supabase/server";

function requestConFirma(rawBody: string, signature: string) {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": signature },
    body: rawBody,
  });
}

describe("Fase 4 — prueba 5: webhook con firma inválida", () => {
  it("responde 400 y no registra el evento ni toca ninguna orden", async () => {
    const eventoFalso = {
      id: `evt_prueba_firma_invalida_${Date.now()}`,
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_no_existe", amount_received: 50000 } },
    };
    const rawBody = JSON.stringify(eventoFalso);

    const respuesta = await POST(requestConFirma(rawBody, "t=1,v1=firma_completamente_inventada"));

    expect(respuesta.status).toBe(400);

    const supabase = createServiceRoleClient();
    const { data: evento } = await supabase
      .from("eventos_stripe_procesados")
      .select("id")
      .eq("id", eventoFalso.id)
      .maybeSingle();

    expect(evento).toBeNull();
  });

  it("responde 400 si falta la cabecera stripe-signature", async () => {
    const respuesta = await POST(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        body: JSON.stringify({ id: "evt_sin_firma", type: "payment_intent.succeeded" }),
      })
    );

    expect(respuesta.status).toBe(400);
  });
});
