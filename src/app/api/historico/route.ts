import { NextResponse } from "next/server";
import { getEdicionesHistoricas } from "@/lib/queries/ediciones";
import { errorInesperado } from "@/lib/api-errors";

export async function GET() {
  try {
    const ediciones = await getEdicionesHistoricas();
    return NextResponse.json({ ediciones });
  } catch (error) {
    return errorInesperado(500, error);
  }
}
