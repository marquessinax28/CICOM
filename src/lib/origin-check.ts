import "server-only";

// CLAUDE.md sección 2: protección CSRF en toda petición que cambie estado
// ("token sincronizado o verificación estricta de Origin/Sec-Fetch-Site").
// Ninguna ruta existente del proyecto la tenía todavía (hueco preexistente,
// anotado como pendiente en CLAUDE.md para las rutas de Fase 4 -- se cierra
// en un cambio aparte). Las rutas nuevas de admin sí la llevan desde el
// inicio, por ser la superficie de mayor riesgo del sitio.
//
// Sec-Fetch-Site es la señal fuerte: todo navegador moderno la manda en
// peticiones fetch/XHR, y "same-origin" es imposible de falsificar desde
// otro origen. Si no viene (cliente viejo o herramienta que no la manda),
// se cae a comparar Origin contra el host real -- más débil, pero mejor que
// no verificar nada.
export function origenEsConfiable(request: Request): boolean {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite) {
    return secFetchSite === "same-origin";
  }

  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}
