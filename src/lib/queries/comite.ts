import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type MiembroComite = {
  id: number;
  nombre: string;
  cargo: string | null;
  foto_url: string | null;
  bio: string | null;
};

export async function getComiteOrganizador(): Promise<MiembroComite[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("comite_organizador")
    .select("id, nombre, cargo, foto_url, bio")
    .order("id", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
