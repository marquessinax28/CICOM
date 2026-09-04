import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { consultarConReintento } from "@/lib/supabase/retry";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { errorEsperado, errorInesperado } from "@/lib/api-errors";
import { BUCKET_BOLETOS_DIGITALES, rutaPdfBoletoDigital } from "@/lib/boletos/plantilla-config";

// Minutos, no horas (CLAUDE.md sección 5-bis) -- el PDF lleva folio y
// contraseña en claro. El bucket es privado (migración
// 20260904090000_boletos_buckets_privados.sql, sin ninguna política de
// SELECT para anon/authenticated): esta es la ÚNICA forma de llegar al
// archivo, nunca hay una ruta pública ni una URL fija reutilizable.
const VIDA_URL_FIRMADA_SEGUNDOS = 300;

export async function GET(request: Request) {
  const ip = getClientIp(request);

  const rate = await checkRateLimit(`comprar:descargar-boleto:ip:${ip}`, 20, 3600);
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

  if (!orden || orden.estado !== "pagado") {
    return errorEsperado(404, "Tu boleto todavía no está listo.");
  }

  // download: fuerza Content-Disposition: attachment (CLAUDE.md sección
  // 10) -- el navegador descarga el PDF en vez de intentar mostrarlo
  // inline.
  const { data, error } = await supabase.storage
    .from(BUCKET_BOLETOS_DIGITALES)
    .createSignedUrl(rutaPdfBoletoDigital(orden.id), VIDA_URL_FIRMADA_SEGUNDOS, {
      download: "boleto-cicom.pdf",
    });

  if (error || !data) {
    // El caso más común aquí es timing: el webhook marcó la orden pagada
    // pero generarYEntregarBoletoDigital todavía no termina de subir el
    // PDF (o falló -- ver el riesgo residual documentado en
    // generar-boleto-digital.ts). Se registra para seguimiento, pero al
    // comprador se le da un mensaje accionable, no un error genérico.
    console.error(`[descargar-boleto] orden ${orden.id}: no se pudo generar la URL firmada —`, error);
    return errorEsperado(
      404,
      "Tu boleto todavía se está generando. Intenta de nuevo en unos segundos; si el problema persiste, contáctanos."
    );
  }

  return NextResponse.json({ url: data.signedUrl });
}
