import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slugify";

export type Concurso = {
  id: number;
  nombre: string;
  descripcion: string | null;
  categoria_tags: string[] | null;
  archivo_bases_pdf: string | null;
  icono_url: string | null;
  fecha_limite: string | null;
  slug: string;
};

function conSlug<T extends { nombre: string }>(fila: T): T & { slug: string } {
  return { ...fila, slug: slugify(fila.nombre) };
}

export async function getConcursos(): Promise<Concurso[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("concursos")
    .select("id, nombre, descripcion, categoria_tags, archivo_bases_pdf, icono_url, fecha_limite")
    .order("nombre", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(conSlug);
}

export async function getConcursoBySlug(slug: string): Promise<Concurso | null> {
  const concursos = await getConcursos();
  return concursos.find((c) => c.slug === slug) ?? null;
}
