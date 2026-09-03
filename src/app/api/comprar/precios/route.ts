import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { errorInesperado } from "@/lib/api-errors";

// Público (sin datos sensibles): la lista de categorías y precios vigentes,
// para que el formulario de compra las muestre. Sigue pasando por una ruta
// de servidor -- el frontend nunca lee precios_boleto directo de Supabase.
export async function GET() {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("precios_boleto")
    .select("categoria, precio_centavos, moneda")
    .eq("tipo_boleto", "digital")
    .eq("activo", true)
    .order("categoria", { ascending: true });

  if (error) {
    return errorInesperado(500, error);
  }

  return NextResponse.json({ precios: data ?? [] });
}
