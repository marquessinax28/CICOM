import "server-only";

// Vercel/proxies exponen la IP real del cliente en x-forwarded-for (primer
// valor de la lista). Sin esto, el rate limiting por IP sería inútil detrás
// de un proxy.
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]!.trim();
  }
  return "desconocida";
}
