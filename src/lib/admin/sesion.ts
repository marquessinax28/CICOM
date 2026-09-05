import "server-only";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  verificarSesionAdmin,
  obtenerCookieDeRequest,
  NOMBRE_COOKIE_SESION_ADMIN,
  type SesionAdminInfo,
} from "./sesion-nucleo";

// La implementación real vive en sesion-nucleo.ts, SIN el guard
// "server-only" -- mismo motivo que hash.ts/resend.ts: src/proxy.ts
// necesita importarla y no puede arrastrar ese guard. Este archivo es el
// punto de entrada para el resto del código de Next (páginas protegidas,
// futuras rutas de API bajo /api/admin).
export * from "./sesion-nucleo";

// Para Server Components y layouts (páginas bajo /admin/(protegido)):
// next/headers sí tiene contexto de petición ahí en el servir real de
// Next. NUNCA usar esto en un Route Handler -- ver
// obtenerSesionAdminDesdeRequest más abajo y el comentario de
// obtenerCookieDeRequest en sesion-nucleo.ts (misma razón que ya causó el
// mismo error en /api/admin/logout).
export async function obtenerSesionAdminActual(): Promise<SesionAdminInfo | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOMBRE_COOKIE_SESION_ADMIN)?.value;
  const supabase = createServiceRoleClient();
  return verificarSesionAdmin(supabase, token);
}

// Para Route Handlers (todo lo bajo /api/admin): lee la cookie del header
// de la Request recibida, no de next/headers -- funciona igual en
// producción real y cuando una prueba importa el export y lo llama
// directo, que es como se prueba cada ruta en este proyecto. Toda ruta de
// API de admin (lotes, y lo que siga en Fase 6b/7) debe usar esta, nunca
// obtenerSesionAdminActual.
export async function obtenerSesionAdminDesdeRequest(
  request: Request
): Promise<SesionAdminInfo | null> {
  const token = obtenerCookieDeRequest(request, NOMBRE_COOKIE_SESION_ADMIN);
  const supabase = createServiceRoleClient();
  return verificarSesionAdmin(supabase, token);
}
