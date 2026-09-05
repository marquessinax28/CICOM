import { NextResponse } from "next/server";
import { loginAdminSchema } from "@/lib/validation/admin";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { getClientIp } from "@/lib/request-ip";
import { origenEsConfiable } from "@/lib/origin-check";
import { errorEsperado, errorInesperado } from "@/lib/api-errors";
import { HASH_DUMMY_LOGIN_ADMIN, compararPasswordAdmin } from "@/lib/hash";
import {
  crearSesionAdmin,
  normalizarUsuario,
  verificarPasswordAdminConBloqueo,
  NOMBRE_COOKIE_SESION_ADMIN,
} from "@/lib/admin/sesion";

// Mensaje único para "usuario no existe" y "contraseña incorrecta"
// (CLAUDE.md sección 7: mensajes no enumerables). La cuenta bloqueada SÍ
// lleva un mensaje distinto -- no es un vector de enumeración (hace falta
// ya haber fallado varias veces contra un usuario que existe para verlo),
// y es información que la única persona que usa este login necesita para
// entender qué pasó.
const MENSAJE_GENERICO = "Usuario o contraseña incorrectos.";

export async function POST(request: Request) {
  if (!origenEsConfiable(request)) {
    return errorEsperado(403, "Origen de la petición no confiable.");
  }

  const ip = getClientIp(request);

  const rateIp = await checkRateLimit(`admin:login:ip:${ip}`, 10, 3600);
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

  const parsed = loginAdminSchema.safeParse(body);
  if (!parsed.success) {
    return errorEsperado(400, "Revisa los datos del formulario e intenta de nuevo.");
  }

  const usuario = normalizarUsuario(parsed.data.usuario);
  const { password, turnstileToken } = parsed.data;

  const rateUsuario = await checkRateLimit(`admin:login:usuario:${usuario}`, 10, 3600);
  if (!rateUsuario.success) {
    return NextResponse.json(
      { error: "Demasiados intentos para este usuario. Intenta de nuevo más tarde." },
      { status: 429, headers: { "Retry-After": String(rateUsuario.retryAfterSeconds) } }
    );
  }

  const turnstileOk = await verifyTurnstile(turnstileToken, ip);
  if (!turnstileOk) {
    return errorEsperado(400, "No se pudo verificar que eres humano. Intenta de nuevo.");
  }

  const supabase = createServiceRoleClient();

  const { data: admin, error: errorSelect } = await supabase
    .from("administradores")
    .select("id, usuario, nombre, rol, password_hash, intentos_fallidos, bloqueado_hasta")
    .eq("usuario", usuario)
    .maybeSingle();
  if (errorSelect) {
    return errorInesperado(500, errorSelect);
  }

  if (!admin) {
    // Comparación contra un hash señuelo -- este camino debe tardar lo
    // mismo que "usuario existe, contraseña incorrecta" (ver hash-nucleo.ts).
    await compararPasswordAdmin(password, HASH_DUMMY_LOGIN_ADMIN);
    return errorEsperado(400, MENSAJE_GENERICO);
  }

  const resultado = await verificarPasswordAdminConBloqueo(supabase, admin, password);
  if (!resultado.ok) {
    if (resultado.motivo === "bloqueado") {
      return errorEsperado(
        429,
        `Cuenta bloqueada temporalmente por demasiados intentos fallidos. Intenta de nuevo en ${resultado.minutosRestantes} minuto(s).`
      );
    }
    return errorEsperado(400, MENSAJE_GENERICO);
  }

  let token: string;
  try {
    token = await crearSesionAdmin(supabase, admin.id);
  } catch (error) {
    return errorInesperado(500, error);
  }

  const respuesta = NextResponse.json({
    ok: true,
    nombre: admin.nombre,
    rol: admin.rol,
  });
  respuesta.cookies.set(NOMBRE_COOKIE_SESION_ADMIN, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    // Vida del cookie = tope absoluto de la sesión (sesion-nucleo.ts). Que
    // el cookie sobreviva más allá de eso no importaría -- la sesión ya
    // habría expirado del lado del servidor -- pero no hay razón para que
    // el navegador lo retenga más tiempo del que puede servir para algo.
    maxAge: 24 * 60 * 60,
  });

  return respuesta;
}
