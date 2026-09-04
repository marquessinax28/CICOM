import "server-only";

// Misma razón que hash.ts: la implementación real vive en resend-nucleo.ts,
// sin este guard, para que scripts/reenviar-boleto.ts pueda importar
// enviarBoletoDigital directamente -- mismo remitente y misma plantilla que
// el flujo normal, sin duplicar el HTML del correo en el script. Este
// archivo sigue siendo el punto de entrada para todo el código de Next.
export * from "./resend-nucleo";
