import "server-only";

// La implementación real vive en generar-boleto-digital-nucleo.ts, SIN este
// guard -- mismo patrón que hash.ts/resend.ts/sesion.ts:
// scripts/reconciliar-ordenes.ts necesita importar
// generarYEntregarBoletoDigital fuera de Next, y ese guard revienta ahí.
// Este archivo sigue siendo el punto de entrada para el código de Next
// (el webhook de Stripe) -- ningún import existente cambia.
export * from "./generar-boleto-digital-nucleo";
