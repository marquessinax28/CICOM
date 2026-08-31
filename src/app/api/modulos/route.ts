import { NextResponse } from "next/server";
import { getModulos } from "@/lib/queries/modulos";
import { errorInesperado } from "@/lib/api-errors";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  const especialidad = searchParams.get("especialidad") ?? undefined;

  try {
    const modulos = await getModulos({ q, especialidad });
    return NextResponse.json({ modulos });
  } catch (error) {
    return errorInesperado(500, error);
  }
}
