import { NextResponse } from "next/server";
import { getSedes } from "@/lib/queries/sedes";
import { errorInesperado } from "@/lib/api-errors";

export async function GET() {
  try {
    const sedes = await getSedes();
    return NextResponse.json({ sedes });
  } catch (error) {
    return errorInesperado(500, error);
  }
}
