import { z } from "zod";

// Tope de 500 por llamada (acordado con el cliente): pdf-lib se vuelve
// lento serializando documentos de miles de páginas, y una llamada que
// tarde demasiado o falle a medio camino es peor que varias tandas más
// chicas. Para cubrir el cupo completo de un tipo, el superadmin genera
// varias tandas -- cada una es su propio lote, su propio PDF y su propio
// Excel con su propia contraseña.
export const CANTIDAD_MAXIMA_POR_LOTE = 500;

export const generarLoteSchema = z
  .object({
    tipo: z.enum(["fisico", "beca_residente", "colchon"]),
    cantidad: z.number().int().min(1).max(CANTIDAD_MAXIMA_POR_LOTE),
    passwordActual: z.string().min(1).max(200),
  })
  .strict();

export type GenerarLoteInput = z.infer<typeof generarLoteSchema>;
