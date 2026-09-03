import "server-only";

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
