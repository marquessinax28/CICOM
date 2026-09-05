import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  generarFolio,
  generarPasswordBoleto,
  hashPasswordBoleto,
  generarPasswordAdmin,
} from "@/lib/hash";
import { generarPdfLoteBoletos } from "@/lib/boletos/pdf-boleto-digital";
import { generarExcelLoteCifrado } from "@/lib/boletos/excel-lote";
import {
  BUCKET_PLANTILLAS_BOLETO,
  RUTA_PLANTILLA_BOLETO_DIGITAL,
} from "@/lib/boletos/plantilla-config";

export const BUCKET_LOTES_BOLETOS = "lotes-boletos";
export function rutaPdfLote(loteId: number): string {
  return `lote-${loteId}.pdf`;
}
export function rutaExcelLote(loteId: number): string {
  return `lote-${loteId}.xlsx`;
}

export type TipoLote = "fisico" | "beca_residente" | "colchon";

// Función pura: recibe el estado de descarga ya consultado, no lo consulta
// ella misma -- así se puede probar con un objeto armado a mano (sin tocar
// la base ni generar un lote real) mientras la ruta sigue usando esta misma
// función contra el registro real. Separarla así fue justo lo que permitió
// escribir tests/fase6b-lotes.test.ts sin dejar un lote de prueba permanente
// en la auditoría real (lotes_boletos no permite DELETE, por diseño).
export function loteYaDescargado(
  lote: { pdf_descargado: boolean; excel_descargado: boolean },
  archivo: "pdf" | "xlsx"
): boolean {
  return archivo === "pdf" ? lote.pdf_descargado : lote.excel_descargado;
}

export type ResultadoGeneracionLote = {
  loteId: number;
  tipo: TipoLote;
  cantidad: number;
  /** Se muestra UNA SOLA VEZ al llamador -- nunca se guarda. */
  passwordExcel: string;
  cupoMaximo: number;
  /** Boletos de este tipo que existen DESPUÉS de esta generación (incluye este lote). */
  generadosTotal: number;
  restante: number;
};

async function subirConReintento(
  intentar: () => Promise<{ error: unknown }>,
  intentos = 2
): Promise<void> {
  let ultimoError: unknown;
  for (let i = 0; i < intentos; i++) {
    const { error } = await intentar();
    if (!error) return;
    ultimoError = error;
  }
  throw ultimoError;
}

// Genera un lote completo: folios+contraseñas (CSPRNG), PDF (una página por
// boleto) y Excel cifrado se construyen ANTES de tocar la base de datos --
// si algo falla ahí, no se consumió cupo ni se creó nada, el superadmin
// simplemente reintenta la petición completa sin efectos secundarios. Solo
// después de tener ambos archivos listos se llama a la función de
// Postgres que de verdad reserva cupo y crea los boletos (fn_generar_lote_boletos,
// una sola transacción). La subida a Storage es lo único que ocurre
// DESPUÉS de ese commit -- ahí sí hay un lleva reintento corto, porque si
// falla en ese punto ya no hay forma de recuperar las contraseñas en claro
// (nunca se guardan, solo el hash) para volver a intentarlo con los mismos
// boletos.
export async function generarLoteBoletos(
  supabase: SupabaseClient<Database>,
  tipo: TipoLote,
  cantidad: number,
  generadoPor: number
): Promise<ResultadoGeneracionLote> {
  const folios = new Set<string>();
  while (folios.size < cantidad) {
    folios.add(generarFolio());
  }
  const listaFolios = [...folios];

  const passwordsPlano: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < cantidad; i++) {
    const password = generarPasswordBoleto();
    passwordsPlano.push(password);
    hashes.push(await hashPasswordBoleto(password));
  }

  const datosPagina = listaFolios.map((folio, i) => ({ folio, password: passwordsPlano[i]! }));

  const { data: plantillaBlob, error: errorPlantilla } = await supabase.storage
    .from(BUCKET_PLANTILLAS_BOLETO)
    .download(RUTA_PLANTILLA_BOLETO_DIGITAL);
  if (errorPlantilla || !plantillaBlob) {
    throw errorPlantilla ?? new Error("No se pudo leer la plantilla del boleto.");
  }
  const plantillaPng = new Uint8Array(await plantillaBlob.arrayBuffer());

  const pdfBytes = await generarPdfLoteBoletos(datosPagina, plantillaPng);

  const passwordExcel = generarPasswordAdmin();
  const excelBuffer = await generarExcelLoteCifrado(datosPagina, passwordExcel);

  // A partir de aquí, cualquier error consumió cupo real -- ver comentario
  // de la función.
  const { data: loteId, error: errorRpc } = await supabase.rpc("fn_generar_lote_boletos", {
    p_tipo: tipo,
    p_cantidad: cantidad,
    p_generado_por: generadoPor,
    p_folios: listaFolios,
    p_password_hashes: hashes,
  });
  if (errorRpc) throw errorRpc;
  const idLote = loteId as number;

  await subirConReintento(() =>
    supabase.storage
      .from(BUCKET_LOTES_BOLETOS)
      .upload(rutaPdfLote(idLote), Buffer.from(pdfBytes), {
        contentType: "application/pdf",
        upsert: false,
      })
  );

  await subirConReintento(() =>
    supabase.storage.from(BUCKET_LOTES_BOLETOS).upload(rutaExcelLote(idLote), excelBuffer, {
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      upsert: false,
    })
  );

  const { data: cupoFila } = await supabase
    .from("cupos_boleto")
    .select("cupo_maximo")
    .eq("tipo", tipo)
    .single();
  const { count: generadosTotal } = await supabase
    .from("boletos")
    .select("id", { count: "exact", head: true })
    .eq("tipo", tipo);

  const cupoMaximo = cupoFila?.cupo_maximo ?? 0;
  const total = generadosTotal ?? 0;

  return {
    loteId: idLote,
    tipo,
    cantidad,
    passwordExcel,
    cupoMaximo,
    generadosTotal: total,
    restante: Math.max(0, cupoMaximo - total),
  };
}
