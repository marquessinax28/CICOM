/**
 * Reemite una URL firmada de vida corta para un archivo de lote (PDF o
 * Excel) que ya figura como descargado -- por si el archivo entregado se
 * pierde. El panel (/admin/lotes) solo permite descargar cada archivo una
 * vez; este script es la vía de recuperación fuera de ese candado, para
 * cuando de verdad hace falta.
 *
 * Uso: npx tsx scripts/reemitir-archivo-lote.ts <id-de-lote> <pdf|xlsx>
 *
 * IMPORTANTE -- esto NO recupera ninguna contraseña:
 *   - El PDF trae folio y contraseña en claro tal como se generaron -- eso
 *     sigue igual, volver a descargarlo no cambia nada de su contenido.
 *   - El Excel está cifrado con una contraseña que el sistema generó y
 *     mostró en pantalla UNA SOLA VEZ al momento de crear el lote
 *     (src/lib/boletos/generar-lote.ts) -- nunca se guardó en ningún lado.
 *     Si esa contraseña se perdió, este script te deja volver a bajar los
 *     mismos bytes cifrados, pero el archivo sigue siendo tan inservible
 *     como antes: sin la contraseña, nadie lo puede abrir, ni tú.
 *
 * Cada uso (éxito o error) queda en reemisiones_lote
 * (supabase/migrations/20260904090600_reemisiones_lote.sql).
 */
import path from "node:path";
import readline from "node:readline/promises";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";
import {
  BUCKET_LOTES_BOLETOS,
  rutaPdfLote,
  rutaExcelLote,
} from "../src/lib/boletos/plantilla-config";

process.loadEnvFile?.(path.resolve(process.cwd(), ".env.local"));

// Vida corta -- mismo criterio que la descarga desde el panel
// (CLAUDE.md sección 10): minutos, no horas.
const VIDA_URL_FIRMADA_SEGUNDOS = 300;

async function main() {
  const [loteIdArg, archivoArg] = process.argv.slice(2);

  if (!loteIdArg || !archivoArg) {
    console.error("Uso: npx tsx scripts/reemitir-archivo-lote.ts <id-de-lote> <pdf|xlsx>");
    process.exit(1);
  }

  const loteId = Number(loteIdArg);
  if (!Number.isInteger(loteId) || loteId <= 0) {
    throw new Error(`Id de lote inválido: "${loteIdArg}".`);
  }
  const archivo = archivoArg.trim().toLowerCase();
  if (archivo !== "pdf" && archivo !== "xlsx") {
    throw new Error(`Archivo inválido: "${archivoArg}" -- debe ser "pdf" o "xlsx".`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  }
  const supabase = createClient<Database>(url, serviceRoleKey, { auth: { persistSession: false } });

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    const { data: lote, error: errorLote } = await supabase
      .from("lotes_boletos")
      .select("id, tipo, cantidad, fecha_generacion, pdf_descargado, excel_descargado, administradores(nombre)")
      .eq("id", loteId)
      .maybeSingle();
    if (errorLote) throw errorLote;
    if (!lote) {
      console.log(`No existe ningún lote con id ${loteId}.`);
      return;
    }

    const yaDescargado = archivo === "pdf" ? lote.pdf_descargado : lote.excel_descargado;

    console.log("\nLote encontrado:");
    console.log(`  id:               ${lote.id}`);
    console.log(`  tipo:             ${lote.tipo}`);
    console.log(`  cantidad:         ${lote.cantidad}`);
    console.log(`  fecha generación: ${lote.fecha_generacion}`);
    console.log(`  generado por:     ${lote.administradores?.nombre ?? "—"}`);
    console.log(`  archivo pedido:   ${archivo}`);
    console.log(
      `  ¿ya descargado?:  ${yaDescargado ? "sí" : "no"}${yaDescargado ? "" : " (nunca se descargó por el panel -- este script funciona igual)"}`
    );

    if (archivo === "xlsx") {
      console.log(
        "\n⚠ Esto NO recupera la contraseña del Excel. Si esa contraseña se perdió, el"
      );
      console.log(
        "  archivo cifrado sigue siendo inservible aunque lo descargues de nuevo -- este"
      );
      console.log("  script solo vuelve a poner los mismos bytes cifrados a tu alcance.");
    }

    const motivo = (await rl.question("\nMotivo de la reemisión (obligatorio): ")).trim();
    if (!motivo) {
      console.log("Motivo vacío. Nada se hizo.");
      return;
    }

    const confirmacion = (await rl.question('\nEscribe "si" para continuar: ')).trim().toLowerCase();
    if (confirmacion !== "si" && confirmacion !== "sí") {
      console.log("Cancelado. Nada se hizo.");
      return;
    }

    const ruta = archivo === "pdf" ? rutaPdfLote(lote.id) : rutaExcelLote(lote.id);
    const nombreDescarga = archivo === "pdf" ? `lote-${lote.id}.pdf` : `lote-${lote.id}.xlsx`;

    try {
      const { data: firmada, error: errorFirmada } = await supabase.storage
        .from(BUCKET_LOTES_BOLETOS)
        .createSignedUrl(ruta, VIDA_URL_FIRMADA_SEGUNDOS, { download: nombreDescarga });
      if (errorFirmada || !firmada) {
        throw errorFirmada ?? new Error("No se pudo generar la URL firmada.");
      }

      await supabase.from("reemisiones_lote").insert({
        lote_id: lote.id,
        archivo,
        motivo,
        resultado: "ok",
      });

      console.log("\n============================================================");
      console.log(`URL firmada (válida ${VIDA_URL_FIRMADA_SEGUNDOS / 60} minutos):`);
      console.log(`   ${firmada.signedUrl}`);
      console.log("Regístrala/descárgala ahora -- no se puede volver a mostrar esta URL,");
      console.log("aunque el script se puede correr de nuevo para emitir una nueva.");
      console.log("============================================================\n");
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      await supabase.from("reemisiones_lote").insert({
        lote_id: lote.id,
        archivo,
        motivo,
        resultado: "error",
        detalle: mensaje,
      });
      throw error;
    }
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
