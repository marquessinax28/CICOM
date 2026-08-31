import { NextResponse } from "next/server";
import { getConcursos } from "@/lib/queries/concursos";
import { errorInesperado } from "@/lib/api-errors";

export async function GET() {
  try {
    const concursos = await getConcursos();
    return NextResponse.json({ concursos });
  } catch (error) {
    return errorInesperado(500, error);
  }
}
