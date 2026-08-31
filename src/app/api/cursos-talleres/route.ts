import { NextResponse } from "next/server";
import { getCursosTalleres } from "@/lib/queries/cursos-talleres";
import { errorInesperado } from "@/lib/api-errors";

export async function GET() {
  try {
    const cursosTalleres = await getCursosTalleres();
    return NextResponse.json({ cursosTalleres });
  } catch (error) {
    return errorInesperado(500, error);
  }
}
