import { NextResponse } from "next/server";
import { verificarCodigoSchema } from "@/lib/validation/comprar";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { getClientIp } from "@/lib/request-ip";
import { errorEsperado, errorInesperado } from "@/lib/api-errors";
import {
  compararCodigoVerificacion,
  generarTokenSesionCompra,
  hashTokenSesionCompra,
} from "@/lib/hash";

const SESION_COMPRA_MINUTOS = 60;
const MAX_INTENTOS = 5;

// Mensaje único para "no existe", "expiró", "ya se usó" y "código
// incorrecto" (CLAUDE.md sección 7: mensajes no enumerables).
const MENSAJE_GENERICO = "Código inválido o expirado. Solicita uno nuevo.";

export async function POST(request: Request) {
  const ip = getClientIp(request);

  const rateIp = await checkRateLimit(`comprar:verificar-codigo:ip:${ip}`, 20, 3600);
  if (!rateIp.success) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta de nuevo más tarde." },
      { status: 429, headers: { "Retry-After": String(rateIp.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorEsperado(400, "Cuerpo inválido.");
  }

  const parsed = verificarCodigoSchema.safeParse(body);
  if (!parsed.success) {
    return errorEsperado(400, "Revisa el código ingresado.");
  }

  const { correo, codigo, turnstileToken } = parsed.data;

  // Bloqueo progresivo por correo, además del límite de 5 intentos por fila
  // de código -- cubre el caso de que alguien solicite muchos códigos
  // distintos para el mismo correo y los pruebe todos.
  const rateCorreo = await checkRateLimit(`comprar:verificar-codigo:correo:${correo}`, 10, 3600);
  if (!rateCorreo.success) {
    return NextResponse.json(
      { error: "Demasiados intentos para este correo. Intenta de nuevo más tarde." },
      { status: 429, headers: { "Retry-After": String(rateCorreo.retryAfterSeconds) } }
    );
  }

  const turnstileOk = await verifyTurnstile(turnstileToken, ip);
  if (!turnstileOk) {
    return errorEsperado(400, "No se pudo verificar que eres humano. Intenta de nuevo.");
  }

  const supabase = createServiceRoleClient();

  const { data: fila, error: selectError } = await supabase
    .from("codigos_verificacion")
    .select("id, codigo_hash, intentos_fallidos")
    .eq("correo", correo)
    .eq("verificado", false)
    .lt("intentos_fallidos", MAX_INTENTOS)
    .gt("expira_en", new Date().toISOString())
    .order("fecha_creacion", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    return errorInesperado(500, selectError);
  }

  if (!fila) {
    return errorEsperado(400, MENSAJE_GENERICO);
  }

  const coincide = await compararCodigoVerificacion(codigo, fila.codigo_hash);

  if (!coincide) {
    await supabase
      .from("codigos_verificacion")
      .update({ intentos_fallidos: fila.intentos_fallidos + 1 })
      .eq("id", fila.id);
    return errorEsperado(400, MENSAJE_GENERICO);
  }

  // Un solo uso: se marca verificado de inmediato, así que este mismo
  // código no vuelve a matchear el filtro `verificado=false` de arriba.
  const { error: updateError } = await supabase
    .from("codigos_verificacion")
    .update({ verificado: true })
    .eq("id", fila.id);

  if (updateError) {
    return errorInesperado(500, updateError);
  }

  // El correo queda fijado del lado del servidor: de aquí en adelante, el
  // resto del flujo de compra lee `correo` de esta fila -- nunca del cuerpo
  // de una petición futura del cliente.
  const token = generarTokenSesionCompra();
  const tokenHash = hashTokenSesionCompra(token);
  const expiraEn = new Date(Date.now() + SESION_COMPRA_MINUTOS * 60_000).toISOString();

  const { error: sesionError } = await supabase
    .from("sesiones_compra")
    .insert({ correo, token_hash: tokenHash, expira_en: expiraEn });

  if (sesionError) {
    return errorInesperado(500, sesionError);
  }

  return NextResponse.json({ ok: true, sesionToken: token });
}
