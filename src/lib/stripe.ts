import "server-only";
import Stripe from "stripe";

// Cliente único de Stripe. Se usa la clave secreta -- nunca la publicable --
// y solo desde rutas de API de servidor (CLAUDE.md sección 8: ninguna clave
// privada en el bundle del cliente).
let cliente: Stripe | null = null;

export function getStripe(): Stripe {
  if (cliente) return cliente;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Falta STRIPE_SECRET_KEY en el entorno");
  }

  cliente = new Stripe(secretKey);
  return cliente;
}
