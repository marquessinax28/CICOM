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
export const crearCheckoutSchema = z
  .object({
    sesionToken: z.string().min(1),
    categoria: z.string().trim().min(1).max(60).default("general"),
    cantidad: z.number().int().min(1).max(10),
    turnstileToken: z.string().min(1),
  })
  .strict();

export type SolicitarCodigoInput = z.infer<typeof solicitarCodigoSchema>;
export type VerificarCodigoInput = z.infer<typeof verificarCodigoSchema>;
export type CrearCheckoutInput = z.infer<typeof crearCheckoutSchema>;
