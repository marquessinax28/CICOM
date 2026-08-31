// Insensible a mayúsculas y acentos ("anest" debe encontrar "ANESTESIOLOGÍA").
// Corre en cliente y servidor -- no depende de unaccent de Postgres porque
// el catálogo completo ya viaja al navegador para el autocompletado en vivo.
export function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
