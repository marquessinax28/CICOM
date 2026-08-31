import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente con service_role: omite RLS por completo. Solo se importa desde
// rutas de API y scripts de servidor -- nunca desde un componente cliente
// (CLAUDE.md sección 1). El paquete `server-only` hace que el build falle
// si algo del lado del cliente intenta importar este archivo.
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno"
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
