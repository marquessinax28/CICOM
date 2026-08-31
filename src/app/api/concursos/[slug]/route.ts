import { NextResponse } from "next/server";
import { getConcursoBySlug } from "@/lib/queries/concursos";
import { errorEsperado, errorInesperado } from "@/lib/api-errors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const concurso = await getConcursoBySlug(slug);
    if (!concurso) {
      return errorEsperado(404, "No encontramos ese concurso.");
    }
    return NextResponse.json({ concurso });
  } catch (error) {
    return errorInesperado(500, error);
  }
}
