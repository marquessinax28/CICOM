import { z } from "zod";

export const loginAdminSchema = z
  .object({
    usuario: z.string().trim().min(1).max(50),
    password: z.string().min(1).max(200),
    turnstileToken: z.string().min(1),
  })
  .strict();

export type LoginAdminInput = z.infer<typeof loginAdminSchema>;
