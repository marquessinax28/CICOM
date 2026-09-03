import { createServiceRoleClient } from "@/lib/supabase/server";
import { generarTokenSesionCompra, hashTokenSesionCompra } from "@/lib/hash";

// Correo distintivo de pruebas: fácil de filtrar y limpiar, e imposible de
// confundir con un comprador real (dominio .invalid nunca resuelve, RFC 2606).
export function correoDePrueba(etiqueta: string): string {
  return `${etiqueta}.${Date.now()}@pruebas.invalid`;
}

// Salta el paso de "solicitar + verificar código" e inserta directo la
// sesión de compra ya verificada -- lo que se prueba aquí es lo que pasa
// DESPUÉS de tener una sesión válida, no el flujo de verificación en sí
// (eso lo ejerce cualquier prueba manual del formulario).
export async function crearSesionCompraDePrueba(correo: string): Promise<string> {
  const supabase = createServiceRoleClient();
  const token = generarTokenSesionCompra();
  const tokenHash = hashTokenSesionCompra(token);
  const expiraEn = new Date(Date.now() + 60 * 60_000).toISOString();

  const { error } = await supabase
    .from("sesiones_compra")
    .insert({ correo, token_hash: tokenHash, expira_en: expiraEn });

  if (error) throw error;
  return token;
}

export async function limpiarOrdenesDePrueba(correo: string) {
  const supabase = createServiceRoleClient();
  await supabase.from("ordenes_compra").delete().eq("correo_comprador", correo);
}

export async function limpiarDatosDePrueba(correo: string) {
  const supabase = createServiceRoleClient();
  await limpiarOrdenesDePrueba(correo);
  await supabase.from("sesiones_compra").delete().eq("correo", correo);
  await supabase.from("codigos_verificacion").delete().eq("correo", correo);
}
