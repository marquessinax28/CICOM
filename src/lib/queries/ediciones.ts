import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type Edicion = {
  id: number;
  numero: number | null;
  nombre: string | null;
  lema: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: "proximo" | "en_curso" | "finalizado" | null;
  es_actual: boolean;
  homenajeado_nombre: string | null;
  homenajeado_bio: string | null;
  homenajeado_foto_home_url: string | null;
  homenajeado_foto_subpagina_url: string | null;
  bienvenida_autor_nombre: string | null;
  bienvenida_autor_foto_url: string | null;
  bienvenida_mensaje: string | null;
};

const COLUMNAS =
  "id, numero, nombre, lema, fecha_inicio, fecha_fin, estado, es_actual, homenajeado_nombre, homenajeado_bio, homenajeado_foto_home_url, homenajeado_foto_subpagina_url, bienvenida_autor_nombre, bienvenida_autor_foto_url, bienvenida_mensaje";

export async function getEdicionActual(): Promise<Edicion | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("ediciones")
    .select(COLUMNAS)
    .eq("es_actual", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getEdicionesHistoricas(): Promise<Edicion[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("ediciones")
    .select(COLUMNAS)
    .eq("es_actual", false)
    .order("numero", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
