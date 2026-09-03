import { config } from "dotenv";

config({ path: ".env.local" });

// STRIPE_WEBHOOK_SECRET no está configurado en .env.local todavía (se
// genera en el Dashboard de Stripe al registrar el endpoint, o vía
// `stripe listen` en desarrollo). Para las pruebas de firma/idempotencia
// (CLAUDE.md sección 14, pruebas 5 y 6) no hace falta el secreto real --
// la prueba firma y verifica con el mismo valor dentro del propio proceso,
// así que un valor local basta. NO usar este valor en producción.
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_" + "a".repeat(32);
}
