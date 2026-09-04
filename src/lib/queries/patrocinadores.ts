import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { consultarConReintento } from "@/lib/supabase/retry";

export type Patrocinador = {
  id: number;
  nombre: string;
  logo_url: string | null;
  link_externo: string | null;
  nivel: "oro" | "plata" | "bronce" | null;
};

export async function getPatrocinadores(): Promise<Patrocinador[]> {
  const supabase = createServiceRoleClient();
  const data = await consultarConReintento(() =>
    supabase.from("patrocinadores").select("id, nombre, logo_url, link_externo, nivel").order("nombre", { ascending: true })
  );
  // `nivel` tiene un CHECK en Postgres (oro/plata/bronce) que el generador
  // de tipos no traduce a unión -- solo ve `text`. Se estrecha aquí.
  return (data as Patrocinador[] | null) ?? [];
}
