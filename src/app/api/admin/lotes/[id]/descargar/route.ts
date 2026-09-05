import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { errorEsperado, errorInesperado } from "@/lib/api-errors";
import { obtenerSesionAdminDesdeRequest } from "@/lib/admin/sesion";
import {
  BUCKET_LOTES_BOLETOS,
  rutaPdfLote,
  rutaExcelLote,
  loteYaDescargado,
} from "@/lib/boletos/generar-lote";

// Vida corta de la URL firmada -- mismo criterio que descargar-boleto y los
// buckets de boletos digitales (CLAUDE.md sección 10).
const VIDA_URL_FIRMADA_SEGUNDOS = 300;

type Contexto = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Contexto) {
  const sesion = await obtenerSesionAdminDesdeRequest(request);
  if (!sesion) {
    return errorEsperado(401, "Sesión inválida o expirada.");
  }
  // Solo superadmin descarga -- el archivo trae credenciales reales en
  // claro para cientos de boletos, igual de sensible sin importar quién lo
  // pida.
  if (sesion.rol !== "superadmin") {
    return errorEsperado(403, "Solo superadmin puede descargar archivos de lote.");
  }

  const { id: idParam } = await params;
  const loteId = Number(idParam);
  if (!Number.isInteger(loteId) || loteId <= 0) {
    return errorEsperado(400, "Id de lote inválido.");
  }

  const archivo = new URL(request.url).searchParams.get("archivo");
  if (archivo !== "pdf" && archivo !== "xlsx") {
    return errorEsperado(400, 'El parámetro "archivo" debe ser "pdf" o "xlsx".');
  }

  const supabase = createServiceRoleClient();
  const { data: lote, error: errorLote } = await supabase
    .from("lotes_boletos")
    .select("id, pdf_descargado, excel_descargado")
    .eq("id", loteId)
    .maybeSingle();
  if (errorLote) {
    return errorInesperado(500, errorLote);
  }
  if (!lote) {
    return errorEsperado(404, "Lote no encontrado.");
  }

  if (loteYaDescargado(lote, archivo)) {
    return errorEsperado(
      410,
      "Este archivo ya se descargó una vez -- no se puede volver a descargar."
    );
  }

  const ruta = archivo === "pdf" ? rutaPdfLote(lote.id) : rutaExcelLote(lote.id);
  const nombreDescarga = archivo === "pdf" ? `lote-${lote.id}.pdf` : `lote-${lote.id}.xlsx`;

  const { data: firmada, error: errorFirmada } = await supabase.storage
    .from(BUCKET_LOTES_BOLETOS)
    .createSignedUrl(ruta, VIDA_URL_FIRMADA_SEGUNDOS, { download: nombreDescarga });
  if (errorFirmada || !firmada) {
    return errorInesperado(500, errorFirmada);
  }

  // Se marca AL EMITIR la URL, no al terminar la descarga -- no hay forma
  // de saber desde el servidor si el archivo llegó a descargarse
  // completo, y confirmarlo desde el cliente sería falsificable.
  const campoDescargado = archivo === "pdf" ? { pdf_descargado: true } : { excel_descargado: true };
  const { error: errorUpdate } = await supabase
    .from("lotes_boletos")
    .update(campoDescargado)
    .eq("id", lote.id);
  if (errorUpdate) {
    return errorInesperado(500, errorUpdate);
  }

  return NextResponse.json({ url: firmada.signedUrl });
}
