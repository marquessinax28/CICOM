import bcrypt from "bcryptjs";
import { createHash, randomBytes, randomInt } from "node:crypto";

// bcryptjs (puro JS, sin bindings nativos) en vez de argon2/bcrypt nativo:
// funciones serverless de Vercel no siempre pueden compilar addons nativos.
// Justo por ser JS puro, su versión "async" NO reparte el trabajo en el
// pool de hilos de libuv (eso es exclusivo del paquete nativo bcrypt) --
// solo usa setImmediate para no bloquear el event loop, pero el cálculo
// entero corre en un solo hilo. Confirmado midiendo: paralelizar con
// Promise.all no bajó el tiempo ni un poco (2026-09-05). Eso importa para
// BCRYPT_COST_BOLETO más abajo, que sí se hashea en volumen.
//
// Un solo costo compartido (12) para código de verificación, contraseña de
// boleto y contraseña de admin funcionaba mientras nadie hasheaba cientos
// de una sentada -- dejó de tener sentido en cuanto la generación de lotes
// empezó a hashear cientos de contraseñas de boleto seguidas (bloqueando
// una función serverless completa). Cada uso tiene ahora su propio costo,
// justificado por separado -- que quede claro que no es descuido si en un
// año alguien se pregunta por qué difieren.

// Código de verificación de 6 dígitos: protege el correo de alguien ANTES
// de una compra. Se hashea uno a la vez, nunca en lote -- el costo no
// afecta el rendimiento de ningún flujo real, así que se queda en el nivel
// alto sin ninguna razón para bajarlo.
const BCRYPT_COST_CODIGO_VERIFICACION = 12;

// Contraseña de boleto (8 caracteres, alfabeto reducido de 32 símbolos --
// ver generarPasswordBoleto). A diferencia del código de arriba, ESTA sí se
// hashea en lote: la generación de boletos físicos hashea cientos seguidas,
// secuencial (bcryptjs no las puede paralelizar, ver el comentario de
// arriba), y a costo 12 eso por sí solo se acercaba al límite de tiempo de
// la función serverless (~112s medidos para 500 -- confirmado en Vercel con
// un FUNCTION_INVOCATION_TIMEOUT real, 2026-09-05). Bajado a 10 (~28s para
// 500, medido) -- el espacio de contraseñas no cambia (32^8 combinaciones);
// lo único que cambia es cuánto le cuesta a un atacante offline probar cada
// intento SI la base de datos se filtra, porque contra el endpoint real la
// defensa sigue siendo el bloqueo progresivo + Turnstile (CLAUDE.md sección
// 6), que no dependen del costo del hash. La longitud de 8 caracteres ya
// era, desde el diseño original (CLAUDE.md sección 2), una entropía nominal
// modesta aceptada a cambio de poder teclearse a mano desde un boleto
// impreso -- este cambio no altera esa ecuación, solo el costo de cada
// intento offline. Los hashes ya emitidos con costo 12 siguen siendo
// válidos para siempre sin ninguna migración: bcrypt guarda el costo
// dentro del propio string del hash ($2b$12$... vs $2b$10$...),
// bcrypt.compare() lo lee de ahí -- verificado que ambos costos conviven
// sin problema en la misma columna.
const BCRYPT_COST_BOLETO = 10;

// Contraseña de administrador (24 caracteres, alfabeto completo -- ver
// generarPasswordAdmin). Solo dos cuentas, se hashea una a la vez y pocas
// veces (login, reautenticación antes de generar un lote) -- nunca en
// volumen, así que el costo no afecta ningún flujo real. Se queda en el
// nivel alto porque protege el acceso más sensible del sistema (genera
// lotes, consume cupo real) -- aquí sí conviene la protección offline más
// fuerte que da un costo alto, sin ningún costo de rendimiento a cambio.
const BCRYPT_COST_ADMIN = 12;

// Código de verificación de 6 dígitos, CSPRNG. Se hashea igual que cualquier
// credencial (CLAUDE.md sección 2) -- nunca se guarda en claro.
export function generarCodigoVerificacion(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function hashCodigoVerificacion(codigo: string): Promise<string> {
  return bcrypt.hash(codigo, BCRYPT_COST_CODIGO_VERIFICACION);
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
  return bcrypt.hash(password, BCRYPT_COST_BOLETO);
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
  return bcrypt.hash(password, BCRYPT_COST_ADMIN);
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
