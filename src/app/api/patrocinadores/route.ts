import { NextResponse } from "next/server";
import { getPatrocinadores } from "@/lib/queries/patrocinadores";
import { errorInesperado } from "@/lib/api-errors";

export async function GET() {
  try {
    const patrocinadores = await getPatrocinadores();
    return NextResponse.json({ patrocinadores });
  } catch (error) {
    return errorInesperado(500, error);
  }
}
