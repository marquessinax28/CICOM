import { NextResponse } from "next/server";
import { generarLoteSchema } from "@/lib/validation/lotes";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { origenEsConfiable } from "@/lib/origin-check";
import { errorEsperado, errorInesperado } from "@/lib/api-errors";
import {
  obtenerSesionAdminDesdeRequest,
  verificarPasswordAdminConBloqueo,
} from "@/lib/admin/sesion";
import { generarLoteBoletos } from "@/lib/boletos/generar-lote";

// Confirmado en producción (Vercel Pro): con cantidad=500, hashear las
// contraseñas con bcrypt costo 12 -- secuencial, una por una -- domina el
// tiempo total y por sí solo se acerca a los 60s por defecto (medido
// localmente: ~112s para 500). 300 es el máximo permitido en el plan Pro.
export const maxDuration = 300;

// Red de seguridad: antes solo la llamada a generarLoteBoletos estaba en un
// try/catch -- cualquier excepción ANTES de eso (ej. una consulta de
// reautenticación que falla por un hipo de red) se escapaba sin capturar y
// Next devolvía su página de error HTML por defecto. El panel no puede
// parsear eso como JSON y caía en el mensaje genérico sin ninguna pista
// (así se vio "No se pudo generar el lote." sin más detalle). Ahora
// CUALQUIER falla, conocida o no, siempre vuelve como JSON categorizado con
// un id de incidente.
export async function POST(request: Request) {
  try {
    return await manejarGenerarLote(request);
  } catch (error) {
    return errorInesperado(500, error);
  }
}

async function manejarGenerarLote(request: Request): Promise<Response> {
  if (!origenEsConfiable(request)) {
    return errorEsperado(403, "Origen de la petición no confiable.");
  }

  // CLAUDE.md sección 2: separación admin/superadmin, el rol se lee del
  // servidor -- nunca de un claim del cliente. Esto es la prueba #9 de la
  // sección 14: un admin (no superadmin) recibe 403.
  const sesion = await obtenerSesionAdminDesdeRequest(request);
  if (!sesion) {
    return errorEsperado(401, "Sesión inválida o expirada.");
  }
  if (sesion.rol !== "superadmin") {
    return errorEsperado(403, "Solo superadmin puede generar lotes.");
  }

  const rate = await checkRateLimit(`admin:lote:generar:${sesion.usuario}`, 20, 3600);
  if (!rate.success) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta de nuevo más tarde." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorEsperado(400, "Cuerpo inválido.");
  }

  const parsed = generarLoteSchema.safeParse(body);
  if (!parsed.success) {
    return errorEsperado(400, "Revisa los datos del formulario e intenta de nuevo.");
  }
  const { tipo, cantidad, passwordActual } = parsed.data;

  const supabase = createServiceRoleClient();

  // Reautenticación (acordado al diferir MFA): generar un lote es
  // irreversible y consume cupo real, así que se vuelve a pedir la
  // contraseña aunque la sesión sea válida. Mismo contador de bloqueo
  // progresivo que el login -- el rol/usuario/id salen de la sesión ya
  // verificada arriba, nunca del cuerpo de esta petición.
  const { data: admin, error: errorAdmin } = await supabase
    .from("administradores")
    .select("password_hash, intentos_fallidos, bloqueado_hasta")
    .eq("id", sesion.administradorId)
    .single();
  if (errorAdmin || !admin) {
    return errorInesperado(500, errorAdmin);
  }

  const resultado = await verificarPasswordAdminConBloqueo(
    supabase,
    { id: sesion.administradorId, ...admin },
    passwordActual
  );
  if (!resultado.ok) {
    if (resultado.motivo === "bloqueado") {
      return errorEsperado(
        429,
        `Cuenta bloqueada temporalmente por demasiados intentos fallidos. Intenta de nuevo en ${resultado.minutosRestantes} minuto(s).`
      );
    }
    return errorEsperado(400, "Contraseña incorrecta.");
  }

  try {
    const resultadoLote = await generarLoteBoletos(supabase, tipo, cantidad, sesion.administradorId);
    return NextResponse.json({ ok: true, ...resultadoLote });
  } catch (error) {
    // Causas conocidas de fn_generar_lote_boletos (migración
    // 20260904090500) distinguidas explícitamente -- el resto cae en el
    // 500 genérico con id de incidente para poder correlacionar con el log.
    const rpcError = error as { code?: string; message?: string };
    if (rpcError.message?.includes("cupo_agotado")) {
      return errorEsperado(
        409,
        `No hay cupo suficiente para generar ${cantidad} boletos de tipo "${tipo}".`
      );
    }
    if (rpcError.message?.includes("cupo_no_configurado")) {
      return errorEsperado(500, `El tipo "${tipo}" no tiene un cupo configurado en cupos_boleto.`);
    }
    if (rpcError.message?.includes("tipo_invalido")) {
      return errorEsperado(400, `Tipo inválido: "${tipo}".`);
    }
    return errorInesperado(500, error);
  }
}
