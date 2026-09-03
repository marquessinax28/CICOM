import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { consultarConReintento } from "@/lib/supabase/retry";

export type Sede = {
  id: number;
  nombre: string;
  direccion: string | null;
  imagen_url: string | null;
};

export async function getSedes(): Promise<Sede[]> {
  const supabase = createServiceRoleClient();
  const data = await consultarConReintento(() =>
    supabase.from("sedes").select("id, nombre, direccion, imagen_url").order("nombre", { ascending: true })
  );
  return data ?? [];
}
