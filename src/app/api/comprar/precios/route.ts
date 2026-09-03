import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { errorInesperado } from "@/lib/api-errors";
import { hoyISO } from "@/lib/precios";

// Público (sin datos sensibles): la lista de categorías y precios vigentes
// HOY, para que el formulario de compra las muestre. Sigue pasando por una
// ruta de servidor -- el frontend nunca lee precios_boleto directo de
// Supabase. Precio por tramos de fecha (CLAUDE.md sección "Pendientes":
// septiembre $550, octubre $650, noviembre $700 MXN) -- mismo criterio de
// vigencia que /api/comprar/crear-checkout-session, para que lo que se
// muestra sea siempre lo que se cobra.
export async function GET() {
  const supabase = createServiceRoleClient();
  const hoy = hoyISO();

  const { data, error } = await supabase
    .from("precios_boleto")
    .select("categoria, precio_centavos, moneda")
    .eq("tipo_boleto", "digital")
    .eq("activo", true)
    .lte("vigente_desde", hoy)
    .or(`vigente_hasta.is.null,vigente_hasta.gte.${hoy}`)
    .order("categoria", { ascending: true });

  if (error) {
    return errorInesperado(500, error);
  }

  return NextResponse.json({ precios: data ?? [] });
}
