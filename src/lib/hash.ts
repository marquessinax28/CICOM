import "server-only";
import bcrypt from "bcryptjs";
import { createHash, randomBytes, randomInt } from "node:crypto";

// bcryptjs (puro JS, sin bindings nativos) en vez de argon2/bcrypt nativo:
// funciones serverless de Vercel no siempre pueden compilar addons nativos,
// y el costo 12 de bcrypt sigue siendo apropiado para el bajo volumen de
// intentos de este flujo (con el bloqueo progresivo por fila que ya aplica
// cada endpoint).
const BCRYPT_COST = 12;

// Código de verificación de 6 dígitos, CSPRNG. Se hashea igual que cualquier
// credencial (CLAUDE.md sección 2) -- nunca se guarda en claro.
export function generarCodigoVerificacion(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function hashCodigoVerificacion(codigo: string): Promise<string> {
  return bcrypt.hash(codigo, BCRYPT_COST);
}

export async function compararCodigoVerificacion(
  codigo: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(codigo, hash);
}

// Token de sesión de compra: alta entropía (32 bytes) generada por CSPRNG,
// a diferencia del código de 6 dígitos. Un hash rápido (SHA-256) es
// apropiado aquí -- el costo de bcrypt existe para proteger secretos de baja
// entropía adivinables por fuerza bruta offline; con 256 bits de entropía
// eso no es la amenaza real, y bcrypt trunca la entrada a 72 bytes de todas
// formas. Mismo patrón que un token de sesión / API key.
export function generarTokenSesionCompra(): string {
  return randomBytes(32).toString("base64url");
}

export function hashTokenSesionCompra(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
