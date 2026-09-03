import "server-only";

// Fecha de hoy en formato YYYY-MM-DD, comparada tal cual contra las
// columnas `date` de precios_boleto (Postgres las evalúa en UTC salvo
// que la sesión diga otra cosa). El corte de mes puede quedar hasta 6
// horas desfasado respecto a la medianoche de Ciudad de México -- para
// tramos de precio de un mes completo (CLAUDE.md: "parametrizable, no
// fijo") esa diferencia no es relevante; si algún día se necesita un
// corte exacto a medianoche local, esta es la función a ajustar.
export function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
}
