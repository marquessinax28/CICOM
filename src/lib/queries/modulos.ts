import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type Modulo = {
  id: number;
  nombre: string;
  descripcion: string | null;
  especialidad: string | null;
  archivo_pdf_url: string | null;
  icono_url: string | null;
  orden: number;
};

export async function getModulos(filtro?: {
  q?: string;
  especialidad?: string;
}): Promise<Modulo[]> {
  const supabase = createServiceRoleClient();
  let query = supabase
    .from("modulos")
    .select("id, nombre, descripcion, especialidad, archivo_pdf_url, icono_url, orden")
    .order("orden", { ascending: true });

  if (filtro?.q) {
    query = query.ilike("nombre", `%${filtro.q}%`);
  }
  if (filtro?.especialidad) {
    query = query.eq("especialidad", filtro.especialidad);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getEspecialidades(): Promise<string[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("modulos")
    .select("especialidad")
    .not("especialidad", "is", null)
    .order("especialidad", { ascending: true });

  if (error) throw error;
  const unicas = new Set(
    (data ?? []).map((fila) => fila.especialidad as string)
  );
  return Array.from(unicas);
}
