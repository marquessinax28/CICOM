import "server-only";
import { cookies } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  verificarSesionAdmin,
  NOMBRE_COOKIE_SESION_ADMIN,
  type SesionAdminInfo,
} from "./sesion-nucleo";

// La implementación real vive en sesion-nucleo.ts, SIN el guard
// "server-only" -- mismo motivo que hash.ts/resend.ts: src/proxy.ts
// necesita importarla y no puede arrastrar ese guard. Este archivo es el
// punto de entrada para el resto del código de Next (páginas protegidas,
// futuras rutas de API bajo /api/admin).
export * from "./sesion-nucleo";

// Atajo para Server Components y Route Handlers: lee la cookie con
// next/headers (API que no existe en proxy.ts, por eso no vive en
// sesion-nucleo.ts) y hace la verificación completa. Toda página bajo
// /admin (protegido) y toda ruta de API de admin futura (Fase 6b: lotes,
// cupos) debe llamar esto -- el layout protegido ya lo hace por las
// páginas, pero un Route Handler no hereda la protección de ningún layout
// (Next.js lo advierte explícitamente: las rutas de servidor no son parte
// del árbol de render), así que cada una debe volver a llamarlo.
export async function obtenerSesionAdminActual(): Promise<SesionAdminInfo | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(NOMBRE_COOKIE_SESION_ADMIN)?.value;
  const supabase = createServiceRoleClient();
  return verificarSesionAdmin(supabase, token);
}
