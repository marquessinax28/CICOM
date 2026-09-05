import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { origenEsConfiable } from "@/lib/origin-check";
import { errorEsperado } from "@/lib/api-errors";
import {
  destruirSesionAdmin,
  obtenerCookieDeRequest,
  NOMBRE_COOKIE_SESION_ADMIN,
} from "@/lib/admin/sesion";

export async function POST(request: Request) {
  if (!origenEsConfiable(request)) {
    return errorEsperado(403, "Origen de la petición no confiable.");
  }

  // Se lee del header de la petición, no de next/headers -- ver el
  // comentario de obtenerCookieDeRequest en sesion-nucleo.ts.
  const token = obtenerCookieDeRequest(request, NOMBRE_COOKIE_SESION_ADMIN);

  if (token) {
    const supabase = createServiceRoleClient();
    await destruirSesionAdmin(supabase, token);
  }

  const respuesta = NextResponse.json({ ok: true });
  respuesta.cookies.delete(NOMBRE_COOKIE_SESION_ADMIN);
  return respuesta;
}
