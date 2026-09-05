/**
 * Crea una cuenta de administrador (admin o superadmin). Solo dos cuentas
 * existen en este sistema -- sin registro público, sin correo, sin flujo de
 * recuperación en la aplicación. La contraseña se imprime UNA SOLA VEZ:
 * no queda guardada en claro en ningún lugar (ni en la base, ni en un log,
 * ni en disco) -- si se pierde, la única salida es rotarla
 * (scripts/rotar-password-admin.ts).
 *
 * Uso: npx tsx scripts/crear-cuenta-admin.ts <usuario> <admin|superadmin> [nombre]
 */
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { generarPasswordAdmin, hashPasswordAdmin } from "../src/lib/hash-nucleo";

process.loadEnvFile?.(path.resolve(process.cwd(), ".env.local"));

async function main() {
  const [usuarioArg, rolArg, nombreArg] = process.argv.slice(2);

  if (!usuarioArg || !rolArg) {
    console.error(
      "Uso: npx tsx scripts/crear-cuenta-admin.ts <usuario> <admin|superadmin> [nombre]"
    );
    process.exit(1);
  }

  const usuario = usuarioArg.trim().toLowerCase();
  const rol = rolArg.trim().toLowerCase();
  const nombre = nombreArg?.trim() || usuario;

  if (!/^[a-z0-9_.-]{3,50}$/.test(usuario)) {
    throw new Error(
      `Usuario inválido: "${usuario}" -- solo minúsculas, dígitos, "_", "." o "-", entre 3 y 50 caracteres.`
    );
  }
  if (rol !== "admin" && rol !== "superadmin") {
    throw new Error(`Rol inválido: "${rol}" -- debe ser "admin" o "superadmin".`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  }
  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

  const { data: existente, error: errorSelect } = await supabase
    .from("administradores")
    .select("id")
    .eq("usuario", usuario)
    .maybeSingle();
  if (errorSelect) throw errorSelect;
  if (existente) {
    throw new Error(`Ya existe una cuenta con el usuario "${usuario}" (id ${existente.id}).`);
  }

  const password = generarPasswordAdmin();
  const passwordHash = await hashPasswordAdmin(password);

  const { data: creado, error: errorInsert } = await supabase
    .from("administradores")
    .insert({ usuario, nombre, rol, password_hash: passwordHash })
    .select("id")
    .single();
  if (errorInsert) throw errorInsert;

  console.log(`Cuenta creada: id=${creado.id}, usuario=${usuario}, rol=${rol}, nombre="${nombre}"`);
  console.log("\n============================================================");
  console.log("CONTRASEÑA -- se muestra UNA SOLA VEZ, no queda guardada en claro en ningún lugar:");
  console.log(`   ${password}`);
  console.log("Entrégala en persona. Si se pierde, la única salida es rotarla con");
  console.log("scripts/rotar-password-admin.ts -- no hay forma de recuperarla.");
  console.log("============================================================\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
