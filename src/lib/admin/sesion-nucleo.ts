// Sin el guard "server-only" (mismo motivo que hash-nucleo.ts/resend-nucleo.ts
// y que plantilla-config.ts): src/proxy.ts necesita verificarSesionAdmin en
// cada petición a /admin, y ese archivo no pasa por el mismo bundling que
// las rutas/componentes de servidor -- no hay garantía de que la condición
// "react-server" que neutraliza el guard aplique ahí también. Este archivo
// nunca se importa desde un Client Component, así que el guard no protege
// nada aquí que crearClienteAdminSupabase() (que solo lee variables de
// entorno de servidor) ya no proteja por su cuenta.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { hashTokenSesionAdmin, generarTokenSesionAdmin } from "@/lib/hash-nucleo";

export function crearClienteAdminSupabase(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno");
  }
  return createClient<Database>(url, serviceRoleKey, { auth: { persistSession: false } });
}

// El UNIQUE de Postgres sobre administradores.usuario es case-sensitive --
// normalizar aquí (y solo aquí) es lo único que garantiza que "Admin" y
// "admin" no puedan coexistir como cuentas distintas.
export function normalizarUsuario(usuario: string): string {
  return usuario.trim().toLowerCase();
}

// Bloqueo progresivo (CLAUDE.md sección 6): entre más intentos fallidos
// consecutivos, más largo el bloqueo. Se evalúa de mayor a menor para
// aplicar siempre el tier más alto que ya se alcanzó.
const TIERS_BLOQUEO = [
  { intentos: 20, minutos: 60 },
  { intentos: 15, minutos: 15 },
  { intentos: 10, minutos: 5 },
  { intentos: 5, minutos: 1 },
];

export function calcularBloqueoHasta(intentosFallidos: number): string | null {
  const tier = TIERS_BLOQUEO.find((t) => intentosFallidos >= t.intentos);
  if (!tier) return null;
  return new Date(Date.now() + tier.minutos * 60_000).toISOString();
}

// Tope absoluto de la sesión (24h) e inactividad máxima (30 min) -- CLAUDE.md
// sección 2 pide ambos. Un panel que va a generar lotes de boletos reales no
// se queda con una sesión viva por más de un día sin importar la actividad.
const SESION_ADMIN_MS_ABSOLUTA = 24 * 60 * 60 * 1000;
const SESION_ADMIN_MS_INACTIVIDAD = 30 * 60 * 1000;

export async function crearSesionAdmin(
  supabase: SupabaseClient<Database>,
  administradorId: number
): Promise<string> {
  const token = generarTokenSesionAdmin();
  const tokenHash = hashTokenSesionAdmin(token);
  const expiraEn = new Date(Date.now() + SESION_ADMIN_MS_ABSOLUTA).toISOString();

  const { error } = await supabase.from("sesiones_admin").insert({
    administrador_id: administradorId,
    token_hash: tokenHash,
    expira_en: expiraEn,
  });
  if (error) throw error;

  return token;
}

export type SesionAdminInfo = {
  administradorId: number;
  usuario: string;
  nombre: string;
  rol: "admin" | "superadmin";
};

// Verificación autoritativa: se llama tanto desde proxy.ts (gate rápido, UX)
// como desde cada página/ruta protegida bajo /admin (la comprobación real --
// CLAUDE.md sección 2, y la propia documentación de Next.js advierte que un
// cambio futuro al matcher de proxy podría dejar una ruta descubierta sin
// que nadie lo note). El rol SIEMPRE sale de este JOIN a administradores,
// nunca de la cookie ni de nada que el cliente pueda manipular.
export async function verificarSesionAdmin(
  supabase: SupabaseClient<Database>,
  tokenCrudo: string | undefined | null
): Promise<SesionAdminInfo | null> {
  if (!tokenCrudo) return null;

  const tokenHash = hashTokenSesionAdmin(tokenCrudo);
  const { data: sesion, error: errorSesion } = await supabase
    .from("sesiones_admin")
    .select("id, administrador_id, expira_en, ultima_actividad")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (errorSesion || !sesion) return null;

  const ahora = Date.now();
  if (new Date(sesion.expira_en).getTime() <= ahora) return null;
  if (ahora - new Date(sesion.ultima_actividad).getTime() > SESION_ADMIN_MS_INACTIVIDAD) return null;

  const { data: admin, error: errorAdmin } = await supabase
    .from("administradores")
    .select("id, usuario, nombre, rol")
    .eq("id", sesion.administrador_id)
    .maybeSingle();
  if (errorAdmin || !admin) return null;

  // Renovación de la ventana de inactividad. Se espera a que termine --
  // "disparar y olvidar" es arriesgado en un runtime serverless, que puede
  // cortar la ejecución en cuanto la función que llamó a esto responde, sin
  // garantía de que esta escritura alcance a completarse.
  await supabase
    .from("sesiones_admin")
    .update({ ultima_actividad: new Date().toISOString() })
    .eq("id", sesion.id);

  return {
    administradorId: admin.id,
    usuario: admin.usuario,
    nombre: admin.nombre,
    rol: admin.rol as "admin" | "superadmin",
  };
}

export async function destruirSesionAdmin(
  supabase: SupabaseClient<Database>,
  tokenCrudo: string
): Promise<void> {
  const tokenHash = hashTokenSesionAdmin(tokenCrudo);
  await supabase.from("sesiones_admin").delete().eq("token_hash", tokenHash);
}

export const NOMBRE_COOKIE_SESION_ADMIN = "cicom_admin_sesion";

// Lee una cookie directamente del header `Cookie` de la petición entrante,
// en vez de `cookies()` de next/headers -- esa función depende de que Next
// haya establecido el contexto de petición (AsyncLocalStorage) alrededor de
// la llamada, algo que SÍ ocurre en un Server Component real, pero NO
// cuando una prueba importa el `POST` exportado de una ruta y lo llama
// directo (como hace toda la suite de este proyecto con cada ruta) --
// "cookies() was called outside a request scope". Parsear el header a mano
// funciona igual en ambos casos, porque `request` es el mismo objeto
// `Request` real sin importar quién invoque la función.
export function obtenerCookieDeRequest(request: Request, nombre: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const parte of header.split(";")) {
    const separador = parte.indexOf("=");
    if (separador === -1) continue;
    const clave = parte.slice(0, separador).trim();
    if (clave !== nombre) continue;
    return decodeURIComponent(parte.slice(separador + 1).trim());
  }
  return undefined;
}
