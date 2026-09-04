import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { consultarConReintento } from "@/lib/supabase/retry";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { errorEsperado, errorInesperado } from "@/lib/api-errors";

// Polling desde /comprar-boleto/exito mientras el webhook de Stripe
// procesa el pago en segundo plano (puede tardar unos segundos en llegar).
// payment_intent es el mismo id que este mismo servidor le devolvió al
// comprador en crear-checkout-session -- no un id que alguien más pueda
// adivinar por fuerza bruta (Stripe genera ~24 caracteres aleatorios), así
// que no hace falta el tratamiento "no enumerable" de folio/contraseña.
// Nunca expone folio ni contraseña -- eso solo sale por
// descargar-boleto/route.ts (URL firmada) o por correo.
export async function GET(request: Request) {
  const ip = getClientIp(request);

  const rate = await checkRateLimit(`comprar:estado-orden:ip:${ip}`, 60, 600);
  if (!rate.success) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo más tarde." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  const paymentIntentId = new URL(request.url).searchParams.get("payment_intent");
  if (!paymentIntentId || !paymentIntentId.startsWith("pi_")) {
    return errorEsperado(400, "Parámetro payment_intent inválido.");
  }

  const supabase = createServiceRoleClient();

  let orden;
  try {
    orden = await consultarConReintento(() =>
      supabase
        .from("ordenes_compra")
        .select("id, estado")
        .eq("stripe_payment_intent_id", paymentIntentId)
        .maybeSingle()
    );
  } catch (error) {
    return errorInesperado(500, error);
  }

  if (!orden) {
    return errorEsperado(404, "No se encontró la orden.");
  }

  let boletoListo = false;
  if (orden.estado === "pagado") {
    try {
      const boleto = await consultarConReintento(() =>
        supabase.from("boletos").select("id").eq("orden_id", orden.id).maybeSingle()
      );
      boletoListo = boleto !== null;
    } catch (error) {
      return errorInesperado(500, error);
    }
  }

  return NextResponse.json({ estado: orden.estado, boletoListo });
}
