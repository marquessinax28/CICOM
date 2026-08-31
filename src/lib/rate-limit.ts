import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitResult = { success: boolean; retryAfterSeconds: number };

// Contador compartido entre instancias (CLAUDE.md sección 6) -- nunca en
// memoria del proceso. `key` identifica el sujeto del límite (ej.
// "contacto:<ip>"), no el endpoint completo -- cada ruta define su propio
// max/ventana según qué tan sensible sea (sección 6).
export async function checkRateLimit(
  key: string,
  max: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    // Sin Upstash configurado no hay forma de aplicar el límite -- fallar
    // cerrado en vez de dejar el endpoint sin protección.
    return { success: false, retryAfterSeconds: 60 };
  }

  const limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(max, `${windowSeconds} s`),
    prefix: "cicom",
  });

  const result = await limiter.limit(key);
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((result.reset - Date.now()) / 1000)
  );

  return { success: result.success, retryAfterSeconds };
}
