import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type Patrocinador = {
  id: number;
  nombre: string;
  logo_url: string | null;
  link_externo: string | null;
  nivel: "oro" | "plata" | "bronce" | null;
};

export async function getPatrocinadores(): Promise<Patrocinador[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("patrocinadores")
    .select("id, nombre, logo_url, link_externo, nivel")
    .order("nombre", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
