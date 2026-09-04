import { NextResponse } from "next/server";
import { contactoSchema } from "@/lib/validation/contacto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { getClientIp } from "@/lib/request-ip";
import { errorEsperado, errorInesperado } from "@/lib/api-errors";
import { enviarAvisoContacto } from "@/lib/resend";

export async function POST(request: Request) {
  const ip = getClientIp(request);

  // Límite por IP antes de tocar el cuerpo o la base de datos.
  const rate = await checkRateLimit(`contacto:${ip}`, 5, 3600);
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

  const parsed = contactoSchema.safeParse(body);
  if (!parsed.success) {
    return errorEsperado(400, "Revisa los datos del formulario e intenta de nuevo.");
  }

  const { nombre, correo, mensaje, turnstileToken } = parsed.data;

  const turnstileOk = await verifyTurnstile(turnstileToken, ip);
  if (!turnstileOk) {
    return errorEsperado(400, "No se pudo verificar que eres humano. Intenta de nuevo.");
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("mensajes_contacto")
    .insert({ nombre, correo, mensaje });

  if (error) {
    return errorInesperado(500, error);
  }

  // El mensaje ya quedó guardado -- el correo es solo un aviso para no
  // depender de entrar a Supabase, nunca la vía principal. Si Resend falla,
  // el mensaje no se pierde: se registra el error y se responde éxito de
  // todas formas, porque desde el punto de vista de quien escribió, su
  // mensaje sí se recibió.
  try {
    await enviarAvisoContacto(nombre, correo, mensaje);
  } catch (avisoError) {
    console.error("[contacto] no se pudo enviar el aviso por correo —", avisoError);
  }

  return NextResponse.json({ ok: true });
}
