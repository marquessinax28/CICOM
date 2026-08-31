import { NextResponse } from "next/server";
import { getComiteOrganizador } from "@/lib/queries/comite";
import { errorInesperado } from "@/lib/api-errors";

export async function GET() {
  try {
    const comite = await getComiteOrganizador();
    return NextResponse.json({ comite });
  } catch (error) {
    return errorInesperado(500, error);
  }
}
