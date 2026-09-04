/**
 * Reenvía (o, en el caso extremo, regenera) el boleto digital de una
 * persona que no lo recibió -- spam, correo mal escrito, o el proceso
 * muriendo entre crear el boleto y terminar de entregarlo
 * (src/lib/boletos/generar-boleto-digital.ts documenta ese riesgo residual).
 *
 * Uso: npx tsx scripts/reenviar-boleto.ts <correo-o-folio>
 *
 * boletos.password_hash es un hash bcrypt de una sola vía -- por diseño
 * (CLAUDE.md sección 9: "las contraseñas se hashean, no se cifran"), no
 * existe manera de recuperar la contraseña original. Por eso este script
 * tiene DOS caminos, no uno:
 *
 *   A) El PDF ya existe en boletos-digitales -- se vuelve a descargar y se
 *      reenvía tal cual. La contraseña original queda intacta: nunca se lee
 *      ni se toca password_hash en este camino. Cubre el 95% de los casos
 *      (spam, correo mal escrito, cualquier falla posterior a la subida).
 *
 *   B) El PDF no existe -- generarYEntregarBoletoDigital intenta enviar el
 *      correo INCLUSO si la subida al bucket falla, así que la ausencia del
 *      PDF no prueba que la contraseña original nunca salió del servidor.
 *      Regenerar aquí exigiría inventar una contraseña nueva, y hacerlo a
 *      ciegas podría invalidar la que esa persona ya tiene en la mano. Por
 *      eso este camino NUNCA rota solo: exige escribir la palabra exacta
 *      "ROTAR" en un prompt separado de la confirmación normal, después de
 *      ver la advertencia completa.
 *
 * Cada reenvío o rotación (éxito o error) queda en reenvios_boleto
 * (supabase/migrations/20260904090200_reenvios_boleto.sql). Una rotación
 * guarda ahí el hash ANTERIOR (nunca la contraseña en claro) para poder
 * verificar después una contraseña vieja reclamada por un asistente.
 */
import path from "node:path";
import readline from "node:readline/promises";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";
import { generarPasswordBoleto, hashPasswordBoleto } from "../src/lib/hash-nucleo";
import { enviarBoletoDigital } from "../src/lib/resend-nucleo";
import { generarPdfBoletoDigital } from "../src/lib/boletos/pdf-boleto-digital";
import {
  BUCKET_BOLETOS_DIGITALES,
  BUCKET_PLANTILLAS_BOLETO,
  RUTA_PLANTILLA_BOLETO_DIGITAL,
  rutaPdfBoletoDigital,
} from "../src/lib/boletos/plantilla-config";

process.loadEnvFile?.(path.resolve(process.cwd(), ".env.local"));

type BoletoRow = Database["public"]["Tables"]["boletos"]["Row"];

function formatearMonto(centavos: number): string {
  return (centavos / 100).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

async function registrarYEnviar(
  supabase: SupabaseClient<Database>,
  boleto: BoletoRow,
  correo: string,
  nombre: string,
  motivo: string,
  accion: "reenvio" | "rotacion_password",
  pdfBytes: Uint8Array,
  passwordHashAnterior: string | null
): Promise<void> {
  try {
    await enviarBoletoDigital(correo, nombre, pdfBytes);
    await supabase.from("reenvios_boleto").insert({
      boleto_id: boleto.id,
      accion,
      motivo,
      resultado: "ok",
      detalle: `Enviado a ${correo}`,
      password_hash_anterior: passwordHashAnterior,
    });
    console.log(`\nCorreo enviado a ${correo}. Registrado en reenvios_boleto.`);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    // Se registra el intento fallido también -- la auditoría cubre
    // "qué se intentó", no solo "qué funcionó".
    await supabase.from("reenvios_boleto").insert({
      boleto_id: boleto.id,
      accion,
      motivo,
      resultado: "error",
      detalle: mensaje,
      password_hash_anterior: passwordHashAnterior,
    });
    throw error;
  }
}

async function main() {
  const consulta = process.argv[2]?.trim();
  if (!consulta) {
    console.error("Uso: npx tsx scripts/reenviar-boleto.ts <correo-o-folio>");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  }
  const supabase = createClient<Database>(url, serviceRoleKey, { auth: { persistSession: false } });

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    // Un folio nunca lleva "@"; un correo siempre lo lleva -- distingue sin
    // ambigüedad cuál de los dos mandó el operador, sin adivinar con un OR
    // de dos columnas de tipos distintos.
    const esCorreo = consulta.includes("@");

    const { data: candidatos, error: errorBusqueda } = esCorreo
      ? await supabase.from("boletos").select("*").eq("tipo", "digital").ilike("correo", consulta)
      : await supabase
          .from("boletos")
          .select("*")
          .eq("tipo", "digital")
          .eq("folio", consulta.toUpperCase());

    if (errorBusqueda) throw errorBusqueda;

    if (!candidatos || candidatos.length === 0) {
      console.log(`No se encontró ningún boleto digital para "${consulta}".`);

      // Diagnóstico de solo lectura: si buscaron por correo y hay una orden
      // pagada sin boleto, es el caso grave documentado en
      // generar-boleto-digital.ts (cupo agotado o caída antes de crear el
      // boleto) -- este script no lo resuelve, pero vale la pena señalarlo
      // en vez de dejar la búsqueda en un silencio ambiguo.
      if (esCorreo) {
        const { data: ordenesSinBoleto } = await supabase
          .from("ordenes_compra")
          .select("id, fecha_compra")
          .eq("correo_comprador", consulta)
          .eq("estado", "pagado");
        if (ordenesSinBoleto && ordenesSinBoleto.length > 0) {
          console.log(
            `\n⚠ Hay ${ordenesSinBoleto.length} orden(es) PAGADA(S) para este correo sin boleto encontrado.`
          );
          console.log(
            "Este script no crea boletos nuevos -- eso es un incidente aparte (cupo agotado o falla antes de crear el boleto). Revisa manualmente:"
          );
          ordenesSinBoleto.forEach((o) => console.log(`   orden ${o.id} — ${o.fecha_compra}`));
        }
      }
      return;
    }

    let boleto = candidatos[0]!;
    if (candidatos.length > 1) {
      console.log(`Se encontraron ${candidatos.length} boletos -- elige uno:\n`);
      candidatos.forEach((b, i) => {
        console.log(
          `  [${i + 1}] folio=${b.folio}  nombre=${b.nombre_completo}  correo=${b.correo}  estado=${b.estado}`
        );
      });
      const eleccion = (await rl.question("\nNúmero a usar: ")).trim();
      const indice = Number(eleccion) - 1;
      const elegido = candidatos[indice];
      if (!Number.isInteger(indice) || !elegido) {
        console.log("Elección inválida. Nada se hizo.");
        return;
      }
      boleto = elegido;
    }

    if (!boleto.correo || !boleto.nombre_completo) {
      console.log(
        "Este boleto no tiene correo o nombre asociado -- no debería pasar en un boleto digital. Abortando sin hacer nada."
      );
      return;
    }
    const correo = boleto.correo;
    const nombre = boleto.nombre_completo;

    if (boleto.orden_id === null) {
      console.log("Este boleto no tiene orden asociada (orden_id nulo) -- no puedo leer el monto. Abortando.");
      return;
    }

    const { data: orden, error: errorOrden } = await supabase
      .from("ordenes_compra")
      .select("id, monto_centavos, estado, fecha_compra")
      .eq("id", boleto.orden_id)
      .single();
    if (errorOrden || !orden) {
      throw errorOrden ?? new Error("No se encontró la orden asociada a este boleto.");
    }

    console.log("\nBoleto encontrado:");
    console.log(`  folio:          ${boleto.folio}`);
    console.log(`  nombre:         ${nombre}`);
    console.log(`  correo:         ${correo}`);
    console.log(`  estado boleto:  ${boleto.estado}`);
    console.log(`  fecha generado: ${boleto.fecha_generado}`);
    console.log(`  orden:          ${orden.id} (${orden.estado}, ${orden.fecha_compra})`);
    console.log(`  monto pagado:   ${formatearMonto(orden.monto_centavos)}`);

    const motivo = (await rl.question("\nMotivo del reenvío (obligatorio): ")).trim();
    if (!motivo) {
      console.log("Motivo vacío. Nada se hizo.");
      return;
    }

    const confirmacion = (await rl.question('\nEscribe "si" para continuar: ')).trim().toLowerCase();
    if (confirmacion !== "si" && confirmacion !== "sí") {
      console.log("Cancelado. Nada se hizo.");
      return;
    }

    const rutaPdf = rutaPdfBoletoDigital(orden.id);
    const { data: pdfExistente, error: errorDescarga } = await supabase.storage
      .from(BUCKET_BOLETOS_DIGITALES)
      .download(rutaPdf);

    // Camino A: el PDF ya existe -- se reenvía tal cual. NUNCA se lee ni se
    // escribe password_hash en este camino.
    if (pdfExistente && !errorDescarga) {
      console.log("\nEl PDF ya existe en el bucket -- se reenvía sin tocar la contraseña.");
      const pdfBytes = new Uint8Array(await pdfExistente.arrayBuffer());
      await registrarYEnviar(supabase, boleto, correo, nombre, motivo, "reenvio", pdfBytes, null);
      return;
    }

    // Camino B: el PDF no existe.
    console.log("\n⚠ El PDF no está en el bucket.");
    console.log(
      "No hay forma de saber con certeza si la contraseña original ya salió por correo en un"
    );
    console.log(
      "intento anterior (el flujo normal intenta enviar el correo incluso si la subida al"
    );
    console.log(
      "bucket falla). Generar una contraseña nueva AHORA invalidaría la que esa persona ya"
    );
    console.log("tenga. Solo continúa si estás seguro de que nunca se le entregó nada.");

    const rotar = (
      await rl.question(
        '\nEscribe exactamente ROTAR para generar una contraseña nueva y reenviar (cualquier otra cosa cancela): '
      )
    ).trim();
    if (rotar !== "ROTAR") {
      console.log("Cancelado. La contraseña no cambió. Nada se hizo.");
      return;
    }

    const passwordNueva = generarPasswordBoleto();
    const passwordHashNueva = await hashPasswordBoleto(passwordNueva);
    const hashAnterior = boleto.password_hash;

    const { error: errorUpdate } = await supabase
      .from("boletos")
      .update({ password_hash: passwordHashNueva })
      .eq("id", boleto.id);
    if (errorUpdate) throw errorUpdate;

    const { data: plantillaBlob, error: errorPlantilla } = await supabase.storage
      .from(BUCKET_PLANTILLAS_BOLETO)
      .download(RUTA_PLANTILLA_BOLETO_DIGITAL);
    if (errorPlantilla || !plantillaBlob) {
      throw errorPlantilla ?? new Error("No se pudo leer la plantilla del boleto.");
    }
    const plantillaPng = new Uint8Array(await plantillaBlob.arrayBuffer());

    const pdfBytes = await generarPdfBoletoDigital(
      {
        folio: boleto.folio,
        password: passwordNueva,
        nombre,
        correo,
        // Mismo monto ya congelado en la orden -- igual que el flujo normal
        // (nunca un precio recalculado).
        costoCentavos: orden.monto_centavos,
      },
      plantillaPng
    );

    const { error: errorSubida } = await supabase.storage
      .from(BUCKET_BOLETOS_DIGITALES)
      .upload(rutaPdf, Buffer.from(pdfBytes), { contentType: "application/pdf", upsert: true });
    if (errorSubida) throw errorSubida;

    await registrarYEnviar(supabase, boleto, correo, nombre, motivo, "rotacion_password", pdfBytes, hashAnterior);

    console.log("\n============================================================");
    console.log("CONTRASEÑA NUEVA -- se muestra UNA SOLA VEZ, no queda guardada en claro en ningún lugar:");
    console.log(`   folio:       ${boleto.folio}`);
    console.log(`   contraseña:  ${passwordNueva}`);
    console.log("Anótala ahora si vas a dictarla por teléfono -- no se puede volver a mostrar.");
    console.log("============================================================\n");
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
