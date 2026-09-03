import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { consultarConReintento } from "@/lib/supabase/retry";

export type MiembroComite = {
  id: number;
  nombre: string;
  cargo: string | null;
  foto_url: string | null;
  bio: string | null;
};

export async function getComiteOrganizador(): Promise<MiembroComite[]> {
  const supabase = createServiceRoleClient();
  const data = await consultarConReintento(() =>
    supabase.from("comite_organizador").select("id, nombre, cargo, foto_url, bio").order("id", { ascending: true })
  );
  return data ?? [];
}
