// Sin "server-only" a propósito -- mismo motivo que hash-nucleo.ts/
// resend-nucleo.ts/plantilla-config.ts: scripts/reconciliar-ordenes.ts
// necesita reutilizar generarYEntregarBoletoDigital fuera de Next (el mismo
// camino que ya usa el webhook, para no reimplementar la lógica de emisión
// de boletos en un segundo lugar). generar-boleto-digital.ts re-exporta
// esto con el guard puesto para el código de Next.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { consultarConReintento } from "@/lib/supabase/retry";
import { generarFolio, generarPasswordBoleto, hashPasswordBoleto } from "@/lib/hash-nucleo";
import { generarPdfBoletoDigital } from "@/lib/boletos/pdf-boleto-digital";
import {
  BUCKET_BOLETOS_DIGITALES,
  BUCKET_PLANTILLAS_BOLETO,
  RUTA_PLANTILLA_BOLETO_DIGITAL,
  rutaPdfBoletoDigital,
} from "@/lib/boletos/plantilla-config";
import { enviarBoletoDigital } from "@/lib/resend-nucleo";

// Se llama desde el webhook de Stripe, justo después de que
// fn_marcar_orden_pagada confirma el pago por primera vez (el llamador ya
// filtró ya_estaba_pagada -- nunca se invoca en un reintento del mismo
// evento), y desde scripts/reconciliar-ordenes.ts para órdenes que Stripe
// cobró pero que se quedaron en 'pendiente' en la base. Genera folio +
// contraseña, los inserta (hasheados) vía fn_crear_boleto_digital, arma el
// PDF con el monto YA CONGELADO en la orden (nunca vuelve a resolver el
// precio vigente) y lo entrega por las dos vías que pide CLAUDE.md: lo sube
// a un bucket privado (para la descarga inmediata desde la página de
// éxito, siempre por URL firmada de vida corta -- nunca una ruta pública) y
// lo manda por correo con Resend.
//
// Riesgo residual documentado: si el proceso se cae DESPUÉS de que
// fn_crear_boleto_digital ya insertó el boleto pero ANTES de terminar (la
// subida a Storage o el envío de correo), el reintento normal de Stripe no
// vuelve a ejecutar este código -- el event.id ya quedó marcado como
// procesado en eventos_stripe_procesados antes de llegar aquí (idempotencia
// del webhook, ver route.ts). Ese caso queda como incidente para
// seguimiento manual de soporte -- descargar-boleto/route.ts (Fase 5,
// siguiente paso) puede reintentar la subida/envío bajo demanda si el
// comprador reporta no haber recibido nada, pero no hay una cola de
// reintento automática todavía.
export async function generarYEntregarBoletoDigital(
  supabase: SupabaseClient<Database>,
  ordenId: number
): Promise<void> {
  const orden = await consultarConReintento(() =>
    supabase
      .from("ordenes_compra")
      .select("nombre_comprador, correo_comprador, monto_centavos")
      .eq("id", ordenId)
      .single()
  );

  // .single() nunca regresa data:null junto con error:null en la práctica
  // (PostgREST lanza si no encuentra fila) -- este chequeo es solo para
  // que tsc lo sepa, misma razón que el chequeo de ordenId en
  // crear-checkout-session/route.ts.
  if (orden === null) {
    console.error(`[boleto digital] orden ${ordenId}: no se encontró la orden inesperadamente.`);
    return;
  }

  const folio = generarFolio();
  const password = generarPasswordBoleto();
  const passwordHash = await hashPasswordBoleto(password);

  // fn_crear_boleto_digital revalida el cupo digital dentro de su propia
  // transacción y falla con 23505 si esta orden ya tiene un boleto (índice
  // único sobre boletos.orden_id) -- ese caso se trata como éxito
  // silencioso: significa que un intento anterior ya completó esta parte,
  // no que algo salió mal ahora. Esto es lo que hace seguro llamar esta
  // función dos veces para la misma orden (ej. el webhook Y luego
  // scripts/reconciliar-ordenes.ts sobre la misma orden por error).
  try {
    await consultarConReintento(() =>
      supabase.rpc("fn_crear_boleto_digital", {
        p_orden_id: ordenId,
        p_folio: folio,
        p_password_hash: passwordHash,
        p_nombre: orden.nombre_comprador,
        p_correo: orden.correo_comprador,
      })
    );
  } catch (error) {
    const rpcError = error as { code?: string; message?: string };
    if (rpcError.code === "23505") {
      console.warn(`[boleto digital] orden ${ordenId} ya tenía boleto -- se omite regenerar.`);
      return;
    }
    // cupo_agotado / cupo_no_configurado aquí es grave: el comprador ya
    // pagó y no se le puede emitir boleto. Se registra como incidente para
    // seguimiento manual (reembolso o ampliación de cupo) -- no se vuelve
    // a lanzar porque el webhook ya debe responder 200 por el pago en sí.
    console.error(
      `[boleto digital] orden ${ordenId}: no se pudo crear el boleto —`,
      rpcError.message ?? error
    );
    return;
  }

  const { data: plantillaBlob, error: errorPlantilla } = await supabase.storage
    .from(BUCKET_PLANTILLAS_BOLETO)
    .download(RUTA_PLANTILLA_BOLETO_DIGITAL);
  if (errorPlantilla || !plantillaBlob) {
    console.error(`[boleto digital] orden ${ordenId}: no se pudo leer la plantilla —`, errorPlantilla);
    return;
  }
  const plantillaPng = new Uint8Array(await plantillaBlob.arrayBuffer());

  const pdfBytes = await generarPdfBoletoDigital(
    {
      folio,
      password,
      nombre: orden.nombre_comprador,
      correo: orden.correo_comprador,
      // SIEMPRE el monto ya congelado en la orden -- nunca
      // obtenerPrecioVigente() ni una nueva lectura de precios_boleto. Ver
      // tests/fase5-boleto-costo-congelado.test.ts.
      costoCentavos: orden.monto_centavos,
    },
    plantillaPng
  );

  const { error: errorSubida } = await supabase.storage
    .from(BUCKET_BOLETOS_DIGITALES)
    .upload(rutaPdfBoletoDigital(ordenId), Buffer.from(pdfBytes), {
      contentType: "application/pdf",
      upsert: false,
    });
  if (errorSubida) {
    console.error(`[boleto digital] orden ${ordenId}: no se pudo subir el PDF —`, errorSubida);
    // Sigue intentando el correo de todas formas -- aunque la descarga
    // inmediata desde la página de éxito falle, el correo (con el mismo
    // PDF ya generado en memoria) es la segunda vía de entrega.
  }

  try {
    await enviarBoletoDigital(orden.correo_comprador, orden.nombre_comprador, pdfBytes);
  } catch (error) {
    console.error(`[boleto digital] orden ${ordenId}: no se pudo enviar el correo —`, error);
  }
}
