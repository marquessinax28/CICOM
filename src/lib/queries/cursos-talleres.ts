import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { consultarConReintento } from "@/lib/supabase/retry";

export type CursoTaller = {
  id: number;
  nombre: string;
  descripcion: string | null;
  archivo_url: string | null;
  icono_url: string | null;
};

export async function getCursosTalleres(): Promise<CursoTaller[]> {
  const supabase = createServiceRoleClient();
  const data = await consultarConReintento(() =>
    supabase.from("cursos_talleres").select("id, nombre, descripcion, archivo_url, icono_url").order("nombre", { ascending: true })
  );
  return data ?? [];
}
