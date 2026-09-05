import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { errorEsperado, errorInesperado } from "@/lib/api-errors";
import { obtenerSesionAdminDesdeRequest } from "@/lib/admin/sesion";

// Lista de solo metadata (tipo, cantidad, fecha, quién lo generó, si ya se
// descargó cada archivo) -- nunca folio/contraseña. Visible para admin y
// superadmin por igual (CLAUDE.md: "admin consulta las tablas de
// boletos..."); la descarga de los archivos en sí es aparte y esa sí es
// solo superadmin (ver [id]/descargar/route.ts).
export async function GET(request: Request) {
  const sesion = await obtenerSesionAdminDesdeRequest(request);
  if (!sesion) {
    return errorEsperado(401, "Sesión inválida o expirada.");
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("lotes_boletos")
    .select("id, tipo, cantidad, fecha_generacion, pdf_descargado, excel_descargado, administradores(nombre)")
    .order("fecha_generacion", { ascending: false });

  if (error) {
    return errorInesperado(500, error);
  }

  return NextResponse.json({ lotes: data ?? [] });
}
