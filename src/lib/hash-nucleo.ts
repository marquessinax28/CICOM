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

// Alfabeto sin caracteres ambiguos (sin 0/O, 1/l/I) -- mismo que exige el
// CHECK de boletos.folio en la migración de esquema. Folio y contraseña de
// boleto comparten alfabeto; solo cambia la longitud (CLAUDE.md sección 2).
const ALFABETO_SIN_AMBIGUOS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function cadenaAleatoria(longitud: number, alfabeto: string = ALFABETO_SIN_AMBIGUOS): string {
  const bytes = randomBytes(longitud);
  let resultado = "";
  for (let i = 0; i < longitud; i++) {
    // Módulo sobre un byte (0-255) contra un alfabeto que no divide 256 no
    // es uniforme -- el sesgo es mínimo y aceptable aquí porque folio/
    // contraseña no son la única defensa (bloqueo progresivo + Turnstile ya
    // cubren fuerza bruta, CLAUDE.md sección 2); randomInt() sería exacto
    // pero exige un límite superior fijo por llamada, más lento para
    // generar caracteres uno por uno sin ganancia real de seguridad aquí.
    resultado += alfabeto[(bytes[i] ?? 0) % alfabeto.length];
  }
  return resultado;
}

export function generarFolio(): string {
  return cadenaAleatoria(12);
}

export function generarPasswordBoleto(): string {
  return cadenaAleatoria(8);
}

export async function hashPasswordBoleto(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function compararPasswordBoleto(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Alfabeto completo para contraseñas de administrador -- a diferencia del
// alfabeto reducido de boletos (pensado para teclearse a mano desde un
// papel impreso, bajo presión de tiempo), estas se entregan en persona y se
// copian a un gestor de contraseñas: no hay motivo para evitar caracteres
// ambiguos o símbolos, y más alfabeto + más longitud es más entropía.
const ALFABETO_PASSWORD_ADMIN =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*-_=+";

// 24 caracteres de un alfabeto de 76 símbolos: ~156 bits de entropía. Muy
// por encima de lo que bcrypt necesita para volverse impracticable de
// romper offline, incluso si el hash se filtrara solo.
export function generarPasswordAdmin(): string {
  return cadenaAleatoria(24, ALFABETO_PASSWORD_ADMIN);
}

export async function hashPasswordAdmin(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function compararPasswordAdmin(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Hash bcrypt fijo de una contraseña que nunca existió -- se compara contra
// esto cuando el usuario de login no existe, para que ese camino tarde lo
// mismo que "usuario existe, contraseña incorrecta" (compararPasswordAdmin
// real). Sin esto, "usuario no existe" respondería más rápido -- un canal
// lateral de tiempo que permite enumerar qué usuarios existen aunque el
// mensaje de error sea idéntico en ambos casos (CLAUDE.md sección 7).
export const HASH_DUMMY_LOGIN_ADMIN =
  "$2b$12$rvwOQJQJpodWBKc6Td/NoeyFjPp8qLYaUsqr3L.vzc87qLKVqOGkq";

// Token de sesión de admin: mismo criterio que generarTokenSesionCompra
// (alta entropía, CSPRNG, hash rápido en vez de bcrypt) -- se nombra aparte
// para no usar en el panel de administración una función literalmente
// llamada "...SesionCompra".
export function generarTokenSesionAdmin(): string {
  return randomBytes(32).toString("base64url");
}

export function hashTokenSesionAdmin(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
