import { z } from "zod";

// Listas de permitidos, no de prohibidos (CLAUDE.md sección 3): cada schema
// es .strict(), así que un campo extra (ej. "precio", "montoTotal",
// "esAdmin") se rechaza por completo -- nunca se lee ni se ignora en
// silencio, y nunca puede colarse a una consulta.

export const solicitarCodigoSchema = z
  .object({
    correo: z.string().trim().toLowerCase().email().max(254),
    turnstileToken: z.string().min(1),
  })
  .strict();

export const verificarCodigoSchema = z
  .object({
    correo: z.string().trim().toLowerCase().email().max(254),
    codigo: z.string().regex(/^\d{6}$/, "El código debe tener 6 dígitos."),
    turnstileToken: z.string().min(1),
  })
  .strict();

// Nunca hay un campo de precio/monto aquí -- el precio se calcula en el
// servidor a partir de `categoria` (una etiqueta, no un número) y de
// precios_boleto. Ver CLAUDE.md sección 5.
//
// Un boleto digital por compra, decisión del comité: cada boleto lleva
// folio y contraseña únicos y da acceso a un certificado a nombre de una
// persona -- permitir varios boletos en una compra hace ambiguo a nombre
// de quién se emite cada certificado. El monto que se cobra sale siempre
// de obtenerPrecioVigente(), nunca de nada que mande el cliente.
//
// `cantidad` se declara a propósito (en vez de dejarla fuera del schema)
// para que quede aceptada y completamente ignorada, sin rechazar la
// petición: no participa en ninguna lógica, sin importar el valor (5, 0,
// -1, lo que sea). Es una excepción deliberada a la regla general de este
// archivo ("todo campo ajeno rechaza la petición completa", CLAUDE.md
// sección 3) -- precio, categoría, rol y cualquier otro campo sensible
// siguen rechazando la petición si aparecen sin estar declarados; solo
// cantidad tiene este trato porque no tiene NINGÚN efecto en el servidor,
// a diferencia de un campo de precio o de rol que sí podría explotarse si
// alguien lo leyera por accidente en el futuro.
// nombre tiene el mismo tope (120) que boletos.nombre_completo -- es el
// destino final de este valor (se dibuja en el PDF del boleto), así que el
// límite se aplica aquí, en el borde, no solo confiando en el CHECK de la
// base de datos.
export const crearCheckoutSchema = z
  .object({
    sesionToken: z.string().min(1),
    nombre: z.string().trim().min(1).max(120),
    categoria: z.string().trim().min(1).max(60).default("general"),
    turnstileToken: z.string().min(1),
    cantidad: z.unknown().optional(),
  })
  .strict();

export type SolicitarCodigoInput = z.infer<typeof solicitarCodigoSchema>;
export type VerificarCodigoInput = z.infer<typeof verificarCodigoSchema>;
export type CrearCheckoutInput = z.infer<typeof crearCheckoutSchema>;
