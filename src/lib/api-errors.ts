import "server-only";
import { NextResponse } from "next/server";

// Patrón único de error para todas las rutas de API (CLAUDE.md sección 7):
// - Errores esperados (validación, límites) -> mensaje específico y
//   accionable, sin necesidad de correlacionarlo con nada.
// - Errores inesperados (excepciones, fallas de base de datos) -> mensaje
//   genérico + identificador de incidente. El detalle completo solo va al
//   log del servidor, nunca al cliente.

// Error esperado: el mensaje mismo ya es información útil para el usuario.
export function errorEsperado(status: number, mensaje: string) {
  return NextResponse.json({ error: mensaje }, { status });
}

// Error inesperado: nunca se expone la causa real (traza de pila, mensaje
// del motor de base de datos, etc.) -- solo un identificador que el usuario
// puede dar como referencia si contacta soporte.
export function errorInesperado(status: number, detalleInterno: unknown) {
  const incidentId = crypto.randomUUID().slice(0, 8);
  console.error(`[incidente ${incidentId}]`, detalleInterno);
  return NextResponse.json(
    {
      error: "Ocurrió un error al procesar tu solicitud. Intenta de nuevo.",
      incidentId,
    },
    { status }
  );
}
