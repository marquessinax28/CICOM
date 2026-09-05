/**
 * Rota la contraseña de una cuenta de administrador existente -- por si
 * una se filtra. Genera una contraseña nueva, actualiza el hash, y borra
 * TODAS las sesiones activas de esa cuenta (sesiones_admin): si la
 * contraseña se filtró, dejar viva una sesión ya abierta haría inútil la
 * rotación -- quien tenga la sesión abierta seguiría adentro hasta que
 * expirara sola.
 *
 * Uso: npx tsx scripts/rotar-password-admin.ts <usuario>
 */
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { generarPasswordAdmin, hashPasswordAdmin } from "../src/lib/hash-nucleo";

process.loadEnvFile?.(path.resolve(process.cwd(), ".env.local"));

async function main() {
  const usuarioArg = process.argv[2];
  if (!usuarioArg) {
    throw new Error("Uso: npx tsx scripts/rotar-password-admin.ts <usuario>");
  }
  const usuario = usuarioArg.trim().toLowerCase();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  }
  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

  const { data: admin, error: errorSelect } = await supabase
    .from("administradores")
    .select("id, nombre, rol")
    .eq("usuario", usuario)
    .maybeSingle();
  if (errorSelect) throw errorSelect;
  if (!admin) {
    throw new Error(`No existe ninguna cuenta con el usuario "${usuario}".`);
  }

  const password = generarPasswordAdmin();
  const passwordHash = await hashPasswordAdmin(password);

  const { error: errorUpdate } = await supabase
    .from("administradores")
    .update({ password_hash: passwordHash, intentos_fallidos: 0, bloqueado_hasta: null })
    .eq("id", admin.id);
  if (errorUpdate) throw errorUpdate;

  const { error: errorDelete, count } = await supabase
    .from("sesiones_admin")
    .delete({ count: "exact" })
    .eq("administrador_id", admin.id);
  if (errorDelete) throw errorDelete;

  console.log(
    `Contraseña rotada: usuario=${usuario} (${admin.nombre}, ${admin.rol}). Sesiones activas invalidadas: ${count ?? 0}.`
  );
  console.log("\n============================================================");
  console.log("CONTRASEÑA NUEVA -- se muestra UNA SOLA VEZ, no queda guardada en claro en ningún lugar:");
  console.log(`   ${password}`);
  console.log("Entrégala en persona. La anterior ya no sirve, ni para nuevas sesiones ni");
  console.log("para las que ya estaban abiertas.");
  console.log("============================================================\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
