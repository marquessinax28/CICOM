import { NextResponse } from "next/server";
import { solicitarCodigoSchema } from "@/lib/validation/comprar";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { getClientIp } from "@/lib/request-ip";
import { errorEsperado, errorInesperado } from "@/lib/api-errors";
import { generarCodigoVerificacion, hashCodigoVerificacion } from "@/lib/hash";
import { enviarCodigoVerificacion } from "@/lib/resend";

const EXPIRACION_MINUTOS = 10;

export async function POST(request: Request) {
  const ip = getClientIp(request);

  // Límite por IP (bots/abuso general) antes de tocar el cuerpo.
  const rateIp = await checkRateLimit(`comprar:solicitar-codigo:ip:${ip}`, 10, 3600);
  if (!rateIp.success) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo más tarde." },
      { status: 429, headers: { "Retry-After": String(rateIp.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorEsperado(400, "Cuerpo inválido.");
  }

  const parsed = solicitarCodigoSchema.safeParse(body);
  if (!parsed.success) {
    return errorEsperado(400, "Revisa el correo ingresado e intenta de nuevo.");
  }

  const { correo, turnstileToken } = parsed.data;

  // Límite por correo (CLAUDE.md sección 6: máximo 3 solicitudes por correo
  // por hora) -- una botnet rota IPs, pero no puede rotar el correo que
  // quiere verificar.
  const rateCorreo = await checkRateLimit(`comprar:solicitar-codigo:correo:${correo}`, 3, 3600);
  if (!rateCorreo.success) {
    return NextResponse.json(
      { error: "Ya solicitaste varios códigos para este correo. Intenta de nuevo más tarde." },
      { status: 429, headers: { "Retry-After": String(rateCorreo.retryAfterSeconds) } }
    );
  }

  const turnstileOk = await verifyTurnstile(turnstileToken, ip);
  if (!turnstileOk) {
    return errorEsperado(400, "No se pudo verificar que eres humano. Intenta de nuevo.");
  }

  const supabase = createServiceRoleClient();

  // Purga oportunista de códigos vencidos (CLAUDE.md sección 5-quater): no
  // se acumula una tabla histórica de correos con códigos. No bloquea la
  // respuesta si falla -- es limpieza, no una condición del flujo.
  await supabase.from("codigos_verificacion").delete().lt("expira_en", new Date().toISOString());

  const codigo = generarCodigoVerificacion();
  const codigoHash = await hashCodigoVerificacion(codigo);
  const expiraEn = new Date(Date.now() + EXPIRACION_MINUTOS * 60_000).toISOString();

  const { error: insertError } = await supabase
    .from("codigos_verificacion")
    .insert({ correo, codigo_hash: codigoHash, expira_en: expiraEn });

  if (insertError) {
    return errorInesperado(500, insertError);
  }

  try {
    await enviarCodigoVerificacion(correo, codigo);
  } catch (error) {
    return errorInesperado(502, error);
  }

  return NextResponse.json({ ok: true });
}
