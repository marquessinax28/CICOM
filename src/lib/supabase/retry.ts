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
// sincronizado.
//
// Ampliado 2026-09-05 tras un 500 real en la portada: una de cinco
// consultas simultáneas volvió con 401 y nunca coincidió con el chequeo
// original (que solo miraba `error.code`/`error.message`) -- probablemente
// porque la petición se rechazó en una capa que no arma un PostgrestError
// completo. `status` es un campo público y documentado de la respuesta de
// postgrest-js (existe siempre, aunque `error` no tenga la forma esperada),
// así que ahora se revisa también eso, no solo el código.
//
// La distinción real no es "PGRST303 sí, todo lo demás no" -- es "¿esto es
// permanente por definición, o podría no serlo?". Según la documentación
// oficial de PostgREST, PGRST300 (sin secreto JWT configurado) y PGRST301
// (el JWT no se pudo decodificar o la firma es inválida) SON permanentes:
// una llave rota vuelve a fallar exactamente igual en el segundo intento,
// así que reintentarlos solo tira ~1.1s a la basura antes de reportar lo
// mismo. Cualquier OTRO 401 (incluido PGRST303, y cualquier 401 que no
// traiga un código reconocible) se trata como potencialmente transitorio.
//
// Importante: esto nunca enmascara un error real. Si el problema es
// permanente, el segundo y tercer intento fallan igual y consultarConReintento
// sigue lanzando la excepción completa al agotar los reintentos -- lo único
// que cambia es que tarda un poco más en reportarse, nunca desaparece.
const MAX_REINTENTOS = 2;
const ESPERA_MS = [300, 800];

// Permanentes por definición (PostgREST, sección de códigos de error):
// ninguna cantidad de reintentos los arregla.
const CODIGOS_PERMANENTES = new Set(["PGRST300", "PGRST301"]);

function obtenerCodigo(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const { code } = error as { code?: unknown };
  return typeof code === "string" ? code : undefined;
}

function esErrorDeRelojFuturo(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { message } = error as { message?: unknown };
  return typeof message === "string" && message.includes("JWT issued at future");
}

function pareceTransitorio(error: unknown, status: number | undefined): boolean {
  const codigo = obtenerCodigo(error);
  if (codigo && CODIGOS_PERMANENTES.has(codigo)) return false;
  if (status === 401) return true;
  // Red adicional por si status no vino poblado por algún motivo -- el
  // chequeo original, ahora como respaldo en vez de única vía.
  return esErrorDeRelojFuturo(error);
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Envuelve una consulta de Supabase (cualquier builder que resuelva a
// { data, error, status }) y reintenta si el fallo parece transitorio
// (ver pareceTransitorio arriba). Uso:
// `return consultarConReintento(() => supabase.from(...)...)`
// en vez de `const { data, error } = await supabase...; if (error) throw error;`.
export async function consultarConReintento<T>(
  ejecutar: () => PromiseLike<{ data: T; error: unknown; status?: number }>
): Promise<T> {
  let ultimoError: unknown;

  for (let intento = 0; intento <= MAX_REINTENTOS; intento++) {
    const { data, error, status } = await ejecutar();
    if (!error) return data;

    ultimoError = error;
    if (!pareceTransitorio(error, status) || intento === MAX_REINTENTOS) break;
    await esperar(ESPERA_MS[intento] ?? 500);
  }

  throw ultimoError;
}
