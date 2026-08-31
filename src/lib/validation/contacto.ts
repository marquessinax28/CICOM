import { z } from "zod";

// Límites de longitud espejo de los CHECK en la migración (defensa en
// profundidad: si esta validación se saltara por un bug, la base de datos
// igual rechaza el insert).
export const contactoSchema = z
  .object({
    nombre: z.string().trim().min(1).max(200),
    correo: z.string().trim().email().max(254),
    mensaje: z.string().trim().min(1).max(5000),
    turnstileToken: z.string().min(1),
  })
  .strict();

export type ContactoInput = z.infer<typeof contactoSchema>;
