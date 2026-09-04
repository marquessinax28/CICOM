import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// Cliente con service_role: omite RLS por completo. Solo se importa desde
// rutas de API y scripts de servidor -- nunca desde un componente cliente
// (CLAUDE.md sección 1). El paquete `server-only` hace que el build falle
// si algo del lado del cliente intenta importar este archivo.
//
// El genérico <Database> (generado con `supabase gen types typescript
// --linked`, ver database.types.ts) hace que tsc conozca los nombres y
// tipos reales de columnas. Sin esto, .from("tabla").select("columna")
// nunca falla en tiempo de compilación aunque la columna no exista o haya
// cambiado de tipo -- justo la clase de error (ej. monto_total vs
// monto_centavos, pesos vs centavos) que ningún tipo genérico detecta.
// Regenerar database.types.ts después de cada migración que cambie el
// esquema (columnas, tablas, funciones RPC).
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno"
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
