import "server-only";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Verifica el token de Turnstile en el servidor (CLAUDE.md sección 6: un
// widget cuyo token no se valida atrás no protege nada). Si el secreto no
// está configurado, falla cerrado.
export async function verifyTurnstile(
  token: string,
  remoteIp?: string
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return false;
  if (!token) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  const res = await fetch(VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) return false;

  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}
