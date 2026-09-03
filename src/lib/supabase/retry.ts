import "server-only";

// PGRST303 "JWT issued at future": bug reconocido de la infraestructura de
// Supabase (desfase de reloj entre los nodos de PostgREST/Auth), no algo
// que este proyecto pueda causar -- nunca generamos JWTs nosotros, solo
// reenviamos la service_role key estática de las variables de entorno en
// cada petición (ver src/lib/supabase/server.ts). Documentado por Supabase:
// https://github.com/orgs/supabase/discussions/48123
//
// Es transitorio por naturaleza: un segundo intento, unos cientos de
// milisegundos después, casi siempre llega a un nodo con el reloj
// sincronizado. Por eso el reintento es angosto -- SOLO para este error
// puntual. Cualquier otro error de Supabase (RLS, columna inexistente,
// tabla sin permisos) falla en el primer intento, tal cual: no hay que
// enmascarar un error real de la aplicación detrás de un reintento.
const MAX_REINTENTOS = 2;
const ESPERA_MS = [300, 800];

function esErrorDeRelojFuturo(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  if (code === "PGRST303") return true;
  return typeof message === "string" && message.includes("JWT issued at future");
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Envuelve una consulta de Supabase (cualquier builder que resuelva a
// { data, error }) y reintenta solo si el error es el PGRST303 transitorio
// de arriba. Uso: `return consultarConReintento(() => supabase.from(...)...)`
// en vez de `const { data, error } = await supabase...; if (error) throw error;`.
export async function consultarConReintento<T>(
  ejecutar: () => PromiseLike<{ data: T; error: unknown }>
): Promise<T> {
  let ultimoError: unknown;

  for (let intento = 0; intento <= MAX_REINTENTOS; intento++) {
    const { data, error } = await ejecutar();
    if (!error) return data;

    ultimoError = error;
    if (!esErrorDeRelojFuturo(error) || intento === MAX_REINTENTOS) break;
    await esperar(ESPERA_MS[intento] ?? 500);
  }

  throw ultimoError;
}
