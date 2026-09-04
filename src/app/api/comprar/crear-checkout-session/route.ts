import { NextResponse } from "next/server";
import { crearCheckoutSchema } from "@/lib/validation/comprar";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { consultarConReintento } from "@/lib/supabase/retry";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { getClientIp } from "@/lib/request-ip";
import { errorEsperado, errorInesperado } from "@/lib/api-errors";
import { hashTokenSesionCompra } from "@/lib/hash";
import { getStripe } from "@/lib/stripe";
import { obtenerPrecioVigente } from "@/lib/precios";

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
  // categoria o turnstileToken -- en particular, no existe (ni existirá
  // nunca) un campo de precio/monto ni de cantidad que el cliente pueda
  // mandar. El monto a cobrar se calcula abajo a partir de precios_boleto;
  // la cantidad es siempre 1 (un boleto digital por compra).
  const parsed = crearCheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return errorEsperado(400, "Datos de compra inválidos.");
  }

  const { sesionToken, categoria, turnstileToken } = parsed.data;

  const turnstileOk = await verifyTurnstile(turnstileToken, ip);
  if (!turnstileOk) {
    return errorEsperado(400, "No se pudo verificar que eres humano. Intenta de nuevo.");
  }

  const supabase = createServiceRoleClient();

  // El correo viene ÚNICAMENTE de la sesión de compra fijada al verificar
  // el código -- nunca del cuerpo de esta petición.
  const tokenHash = hashTokenSesionCompra(sesionToken);
  let sesion;
  try {
    sesion = await consultarConReintento(() =>
      supabase
        .from("sesiones_compra")
        .select("correo, expira_en")
        .eq("token_hash", tokenHash)
        .gt("expira_en", new Date().toISOString())
        .maybeSingle()
    );
  } catch (error) {
    return errorInesperado(500, error);
  }
  if (!sesion) {
    return errorEsperado(401, "Tu verificación de correo expiró. Solicita un nuevo código.");
  }

  const correo = sesion.correo;

  // Precio por tramos de fecha (septiembre $550, octubre $650, noviembre
  // $700 MXN, parametrizado en precios_boleto -- nunca fijo en código). El
  // tramo se resuelve con la fecha de HOY en el servidor, nunca con nada
  // que mande el cliente. obtenerPrecioVigente lanza si no hay tramo
  // activo -- nunca cobra un precio por defecto.
  let precio;
  try {
    precio = await obtenerPrecioVigente(supabase, categoria);
  } catch {
    return errorEsperado(400, "Esa categoría de boleto no está disponible.");
  }

  let ordenId;
  try {
    ordenId = await consultarConReintento(() =>
      supabase.rpc("fn_reservar_orden_digital", {
        p_nombre: correo,
        p_correo: correo,
        p_categoria: categoria,
        p_precio_unitario_centavos: precio.precioCentavos,
        p_precios_boleto_id: precio.id,
      })
    );
  } catch (error) {
    const reservaError = error as { message?: string };
    if (reservaError.message?.includes("cupo_agotado")) {
      return errorEsperado(409, "Se agotó el cupo de boletos digitales disponibles.");
    }
    if (reservaError.message?.includes("cupo_no_configurado")) {
      return errorEsperado(503, "La compra de boletos no está disponible en este momento.");
    }
    return errorInesperado(500, error);
  }

  // fn_reservar_orden_digital nunca regresa null en la práctica -- o
  // devuelve el id insertado, o lanza (capturado arriba). El tipo
  // generado la marca `number | null` porque Postgres no distingue eso a
  // nivel de tipos para una función escalar; este chequeo lo deja
  // explícito para tsc y falla cerrado si alguna vez no se cumple.
  if (ordenId === null) {
    return errorInesperado(500, new Error("fn_reservar_orden_digital regresó null inesperadamente"));
  }

  const montoTotalCentavos = precio.precioCentavos;

  try {
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: montoTotalCentavos,
      currency: "mxn",
      receipt_email: correo,
      automatic_payment_methods: { enabled: true },
      metadata: {
        orden_id: String(ordenId),
        categoria,
        monto_centavos: String(montoTotalCentavos),
        precios_boleto_id: String(precio.id),
      },
    });

    await consultarConReintento(() =>
      supabase.from("ordenes_compra").update({ stripe_payment_intent_id: paymentIntent.id }).eq("id", ordenId)
    );

    return NextResponse.json({
      ok: true,
      clientSecret: paymentIntent.client_secret,
      montoTotalCentavos,
    });
  } catch (error) {
    // Libera la reserva de cupo: la orden queda 'fallido' en vez de seguir
    // contando como 'pendiente'. Best-effort -- si esta misma limpieza
    // choca con un PGRST303, la orden se libera sola por el corte de 30
    // minutos en fn_reservar_orden_digital.
    try {
      await consultarConReintento(() =>
        supabase.from("ordenes_compra").update({ estado: "fallido" }).eq("id", ordenId)
      );
    } catch {
      // Ver comentario de arriba: no hay nada más que hacer aquí.
    }
    return errorInesperado(502, error);
  }
}
