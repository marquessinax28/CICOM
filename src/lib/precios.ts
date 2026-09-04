import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { consultarConReintento } from "@/lib/supabase/retry";

// Fecha de hoy en formato YYYY-MM-DD, en la zona horaria de Guadalajara
// (America/Mexico_City -- Zona Centro, UTC-6 todo el año desde que México
// eliminó el horario de verano en 2022). El corte de tramo de precio debe
// caer a medianoche LOCAL, no UTC: alguien que compra a las 11 PM del 30
// de septiembre en Guadalajara sigue en septiembre (paga $550), aunque en
// UTC ya sean las 5 AM del 1 de octubre. Usar toISOString().slice(0,10)
// aquí sería el bug exacto que esto evita -- cobraría $650 seis horas
// antes de que termine septiembre en horario local.
//
// Intl.DateTimeFormat con locale "en-CA" formatea nativo como YYYY-MM-DD,
// así que no hace falta reordenar manualmente las partes.
const formateadorFechaGuadalajara = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Mexico_City",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function hoyISO(): string {
  return formateadorFechaGuadalajara.format(new Date());
}

export type PrecioVigente = {
  /** id de la fila de precios_boleto que aplicó -- para auditoría (ordenes_compra.precios_boleto_id). */
  id: number;
  precioCentavos: number;
};

// Único punto donde se resuelve "cuánto cuesta un boleto digital de esta
// categoría, en la fecha `hoy`" -- crear-checkout-session la usa para
// cobrar (sin pasar `hoy`, así que usa la fecha real de hoyISO()). Nunca
// inventa un precio por defecto: si no hay un tramo vigente (fecha sin
// cubrir, categoría inexistente), lanza -- la compra se bloquea en vez de
// cobrar un valor arbitrario.
//
// `hoy` es inyectable (YYYY-MM-DD) para las pruebas de frontera de tramo
// -- así se prueba la resolución del tramo directo contra la base real,
// sin tener que simular el reloj del sistema ni depender de en qué mes se
// ejecute la prueba.
export async function obtenerPrecioVigente(
  supabase: SupabaseClient,
  categoria: string,
  hoy: string = hoyISO()
): Promise<PrecioVigente> {
  const fila = await consultarConReintento(() =>
    supabase
      .from("precios_boleto")
      .select("id, precio_centavos")
      .eq("tipo_boleto", "digital")
      .eq("categoria", categoria)
      .eq("activo", true)
      .lte("vigente_desde", hoy)
      .or(`vigente_hasta.is.null,vigente_hasta.gte.${hoy}`)
      .maybeSingle()
  );

  if (!fila) {
    throw new Error(`precio_no_vigente: sin tramo de precio activo para categoria="${categoria}"`);
  }

  return { id: fila.id, precioCentavos: fila.precio_centavos };
}
