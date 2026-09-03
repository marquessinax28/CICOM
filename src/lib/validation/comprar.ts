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
// Tampoco hay campo de cantidad: un boleto digital por compra, decisión
// del comité (el certificado es individual y se accede con el correo del
// boleto). No es que "cantidad" se ignore -- no existe en el schema, así
// que .strict() rechaza la petición completa si alguien lo manda, igual
// que con cualquier campo de precio.
export const crearCheckoutSchema = z
  .object({
    sesionToken: z.string().min(1),
    categoria: z.string().trim().min(1).max(60).default("general"),
    turnstileToken: z.string().min(1),
  })
  .strict();

export type SolicitarCodigoInput = z.infer<typeof solicitarCodigoSchema>;
export type VerificarCodigoInput = z.infer<typeof verificarCodigoSchema>;
export type CrearCheckoutInput = z.infer<typeof crearCheckoutSchema>;
