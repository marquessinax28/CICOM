import { NextResponse } from "next/server";
import { getEdicionActual } from "@/lib/queries/ediciones";
import { errorInesperado } from "@/lib/api-errors";

export async function GET() {
  try {
    const edicionActual = await getEdicionActual();
    return NextResponse.json({ edicionActual });
  } catch (error) {
    return errorInesperado(500, error);
  }
}
