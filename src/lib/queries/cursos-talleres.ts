import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type CursoTaller = {
  id: number;
  nombre: string;
  descripcion: string | null;
  archivo_url: string | null;
  icono_url: string | null;
};

export async function getCursosTalleres(): Promise<CursoTaller[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("cursos_talleres")
    .select("id, nombre, descripcion, archivo_url, icono_url")
    .order("nombre", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
