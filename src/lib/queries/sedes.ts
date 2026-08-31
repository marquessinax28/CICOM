import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type Sede = {
  id: number;
  nombre: string;
  direccion: string | null;
  imagen_url: string | null;
};

export async function getSedes(): Promise<Sede[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("sedes")
    .select("id, nombre, direccion, imagen_url")
    .order("nombre", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
