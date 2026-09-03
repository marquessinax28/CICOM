import { NextResponse } from "next/server";
import { verificarCodigoSchema } from "@/lib/validation/comprar";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { consultarConReintento } from "@/lib/supabase/retry";
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

// LOGGING TEMPORAL DE DEPURACIÓN -- distingue la causa real de un rechazo
// (turnstile inválido / código no encontrado / hash que no coincide / código
// expirado / ya usado / intentos agotados) sin tocar el mensaje genérico que
// ve el usuario. Nunca registra el código en claro ni el hash (CLAUDE.md
// sección 7): solo el correo (para correlacionar la prueba) y el motivo.
// Quitar o poner detrás de una bandera de entorno antes de dejarlo corriendo
// en producción por tiempo indefinido.
function logDiagnostico(correo: string, motivo: string) {
  console.warn(`[verificar-codigo] rechazo -- correo=${correo} motivo=${motivo}`);
}

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
    logDiagnostico(correo, "turnstile_invalido");
    return errorEsperado(400, "No se pudo verificar que eres humano. Intenta de nuevo.");
  }

  const supabase = createServiceRoleClient();

  let fila;
  try {
    fila = await consultarConReintento(() =>
      supabase
        .from("codigos_verificacion")
        .select("id, codigo_hash, intentos_fallidos")
        .eq("correo", correo)
        .eq("verificado", false)
        .lt("intentos_fallidos", MAX_INTENTOS)
        .gt("expira_en", new Date().toISOString())
        .order("fecha_creacion", { ascending: false })
        .limit(1)
        .maybeSingle()
    );
  } catch (error) {
    return errorInesperado(500, error);
  }

  if (!fila) {
    // La consulta de arriba ya aplicó las cuatro condiciones a la vez
    // (verificado=false, intentos<MAX, no expirado) -- si no hay fila, se
    // vuelve a consultar sin esos filtros solo para diagnosticar CUÁL de
    // las cuatro fue. Es una consulta extra únicamente para este log
    // temporal; el filtro original sigue siendo la única fuente de verdad
    // para la decisión de aceptar/rechazar.
    const { data: diagnostico } = await supabase
      .from("codigos_verificacion")
      .select("verificado, expira_en, intentos_fallidos")
      .eq("correo", correo)
      .order("fecha_creacion", { ascending: false })
      .limit(1)
      .maybeSingle();

    let motivo: string;
    if (!diagnostico) {
      motivo = "codigo_no_encontrado";
    } else if (diagnostico.verificado) {
      motivo = "codigo_ya_usado";
    } else if (diagnostico.intentos_fallidos >= MAX_INTENTOS) {
      motivo = "intentos_agotados";
    } else if (new Date(diagnostico.expira_en) <= new Date()) {
      motivo = "codigo_expirado";
    } else {
      motivo = "desconocido";
    }
    logDiagnostico(correo, motivo);
    return errorEsperado(400, MENSAJE_GENERICO);
  }

  const coincide = await compararCodigoVerificacion(codigo, fila.codigo_hash);

  if (!coincide) {
    logDiagnostico(correo, "hash_no_coincide");
    await supabase
      .from("codigos_verificacion")
      .update({ intentos_fallidos: fila.intentos_fallidos + 1 })
      .eq("id", fila.id);
    return errorEsperado(400, MENSAJE_GENERICO);
  }

  // Un solo uso: se marca verificado de inmediato, así que este mismo
  // código no vuelve a matchear el filtro `verificado=false` de arriba.
  try {
    await consultarConReintento(() =>
      supabase.from("codigos_verificacion").update({ verificado: true }).eq("id", fila.id)
    );
  } catch (error) {
    return errorInesperado(500, error);
  }

  // El correo queda fijado del lado del servidor: de aquí en adelante, el
  // resto del flujo de compra lee `correo` de esta fila -- nunca del cuerpo
  // de una petición futura del cliente.
  const token = generarTokenSesionCompra();
  const tokenHash = hashTokenSesionCompra(token);
  const expiraEn = new Date(Date.now() + SESION_COMPRA_MINUTOS * 60_000).toISOString();

  try {
    await consultarConReintento(() =>
      supabase.from("sesiones_compra").insert({ correo, token_hash: tokenHash, expira_en: expiraEn })
    );
  } catch (error) {
    return errorInesperado(500, error);
  }

  return NextResponse.json({ ok: true, sesionToken: token });
}
