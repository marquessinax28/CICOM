import { NextResponse } from "next/server";
import { crearCheckoutSchema } from "@/lib/validation/comprar";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { getClientIp } from "@/lib/request-ip";
import { errorEsperado, errorInesperado } from "@/lib/api-errors";
import { hashTokenSesionCompra } from "@/lib/hash";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  const ip = getClientIp(request);

  const rate = await checkRateLimit(`comprar:crear-checkout:ip:${ip}`, 10, 3600);
  if (!rate.success) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo más tarde." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorEsperado(400, "Cuerpo inválido.");
  }

  // .strict() del schema ya rechaza cualquier campo que no sea sesionToken,
  // categoria o cantidad -- en particular, no existe (ni existirá nunca) un
  // campo de precio/monto que el cliente pueda mandar. El monto a cobrar se
  // calcula abajo, entero, a partir de precios_boleto.
  const parsed = crearCheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return errorEsperado(400, "Datos de compra inválidos.");
  }

  const { sesionToken, categoria, cantidad, turnstileToken } = parsed.data;

  const turnstileOk = await verifyTurnstile(turnstileToken, ip);
  if (!turnstileOk) {
    return errorEsperado(400, "No se pudo verificar que eres humano. Intenta de nuevo.");
  }

  const supabase = createServiceRoleClient();

  // El correo viene ÚNICAMENTE de la sesión de compra fijada al verificar
  // el código -- nunca del cuerpo de esta petición.
  const tokenHash = hashTokenSesionCompra(sesionToken);
  const { data: sesion, error: sesionError } = await supabase
    .from("sesiones_compra")
    .select("correo, expira_en")
    .eq("token_hash", tokenHash)
    .gt("expira_en", new Date().toISOString())
    .maybeSingle();

  if (sesionError) {
    return errorInesperado(500, sesionError);
  }
  if (!sesion) {
    return errorEsperado(401, "Tu verificación de correo expiró. Solicita un nuevo código.");
  }

  const correo = sesion.correo;

  const { data: precio, error: precioError } = await supabase
    .from("precios_boleto")
    .select("precio_centavos")
    .eq("tipo_boleto", "digital")
    .eq("categoria", categoria)
    .eq("activo", true)
    .maybeSingle();

  if (precioError) {
    return errorInesperado(500, precioError);
  }
  if (!precio) {
    return errorEsperado(400, "Esa categoría de boleto no está disponible.");
  }

  const { data: ordenId, error: reservaError } = await supabase.rpc(
    "fn_reservar_orden_digital",
    {
      p_nombre: correo,
      p_correo: correo,
      p_cantidad: cantidad,
      p_categoria: categoria,
      p_precio_unitario_centavos: precio.precio_centavos,
    }
  );

  if (reservaError) {
    if (reservaError.message.includes("cupo_agotado")) {
      return errorEsperado(409, "Se agotó el cupo de boletos digitales disponibles.");
    }
    if (reservaError.message.includes("cupo_no_configurado")) {
      return errorEsperado(503, "La compra de boletos no está disponible en este momento.");
    }
    return errorInesperado(500, reservaError);
  }

  const montoTotalCentavos = precio.precio_centavos * cantidad;

  try {
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: montoTotalCentavos,
      currency: "mxn",
      receipt_email: correo,
      automatic_payment_methods: { enabled: true },
      metadata: { orden_id: String(ordenId), categoria, cantidad: String(cantidad) },
    });

    const { error: updateError } = await supabase
      .from("ordenes_compra")
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq("id", ordenId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      ok: true,
      clientSecret: paymentIntent.client_secret,
      montoTotalCentavos,
    });
  } catch (error) {
    // Libera la reserva de cupo: la orden queda 'fallido' en vez de seguir
    // contando como 'pendiente'.
    await supabase.from("ordenes_compra").update({ estado: "fallido" }).eq("id", ordenId);
    return errorInesperado(502, error);
  }
}
