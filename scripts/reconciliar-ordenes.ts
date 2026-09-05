/**
 * Reconcilia órdenes de compra atascadas en 'pendiente' contra el estado
 * real en Stripe -- el hueco que motivó este script: un 401 transitorio de
 * Supabase (u otro fallo) puede dejar una orden pagada en Stripe pero
 * nunca marcada 'pagado' en la base, sin boleto, sin ninguna alerta más
 * allá de una línea en el log del webhook. Nadie se entera salvo que la
 * persona reclame.
 *
 * Uso: npx tsx scripts/reconciliar-ordenes.ts [minutos]
 *   minutos: qué tan vieja debe ser una orden 'pendiente' para revisarla
 *            (default 30 -- mismo umbral que ya usa fn_reservar_orden_digital
 *            para no contar reservas recientes hacia el cupo). Una orden
 *            más nueva que esto probablemente sigue en checkout de verdad.
 *
 * Para cada orden candidata, consulta el PaymentIntent real en Stripe y la
 * clasifica en tres grupos:
 *   - COBRADA EN STRIPE, PENDIENTE EN LA BASE -- el caso grave. Requiere
 *     confirmación explícita antes de reparar.
 *   - PENDIENTE EN AMBOS -- abandono normal de checkout, no requiere nada.
 *   - FALLIDA EN STRIPE -- Stripe la canceló; se reporta, no se repara
 *     automáticamente (liberar cupo es un cambio de estado aparte, no lo
 *     que este script existe para hacer).
 *
 * La reparación llama exactamente las mismas dos funciones que usa el
 * webhook (fn_marcar_orden_pagada + generarYEntregarBoletoDigital) --
 * nunca reimplementa esa lógica en un segundo lugar. Eso es también lo que
 * garantiza la idempotencia: fn_marcar_orden_pagada regresa de inmediato
 * si la orden ya está 'pagado' (ver la migración
 * 20260903090700_fix_fn_marcar_orden_pagada_no_revertir_fallido.sql), y
 * fn_crear_boleto_digital tiene un índice único sobre boletos.orden_id --
 * correr este script dos veces sobre la misma orden, o correrlo después de
 * que el webhook ya la procesó por su cuenta, no genera un segundo boleto.
 *
 * Cada reparación (éxito o error) queda en reconciliaciones_orden
 * (supabase/migrations/20260905090000_reconciliaciones_orden.sql).
 */
import path from "node:path";
import readline from "node:readline/promises";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";
import { generarYEntregarBoletoDigital } from "../src/lib/boletos/generar-boleto-digital-nucleo";

process.loadEnvFile?.(path.resolve(process.cwd(), ".env.local"));

const MINUTOS_DEFAULT = 30;

function formatearMonto(centavos: number): string {
  return (centavos / 100).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

async function main() {
  const minutos = process.argv[2] ? Number(process.argv[2]) : MINUTOS_DEFAULT;
  if (!Number.isFinite(minutos) || minutos <= 0) {
    throw new Error(`Minutos inválido: "${process.argv[2]}".`);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  }
  if (!stripeSecretKey) {
    throw new Error("Falta STRIPE_SECRET_KEY en .env.local");
  }
  const supabase = createClient<Database>(url, serviceRoleKey, { auth: { persistSession: false } });
  const stripe = new Stripe(stripeSecretKey);

  const corteISO = new Date(Date.now() - minutos * 60_000).toISOString();

  const { data: candidatas, error: errorCandidatas } = await supabase
    .from("ordenes_compra")
    .select("id, nombre_comprador, correo_comprador, monto_centavos, fecha_compra, stripe_payment_intent_id")
    .eq("estado", "pendiente")
    .lt("fecha_compra", corteISO)
    .not("stripe_payment_intent_id", "is", null)
    .order("fecha_compra", { ascending: true });

  if (errorCandidatas) throw errorCandidatas;

  if (!candidatas || candidatas.length === 0) {
    console.log(`No hay órdenes 'pendiente' de más de ${minutos} minutos. Nada que revisar.`);
    return;
  }

  console.log(`Revisando ${candidatas.length} orden(es) pendiente(s) de más de ${minutos} minutos...\n`);

  const cobradaPendiente: Array<{ orden: (typeof candidatas)[number]; pi: Stripe.PaymentIntent }> = [];
  const pendienteEnAmbos: Array<{ orden: (typeof candidatas)[number]; pi: Stripe.PaymentIntent }> = [];
  const falloEnStripe: Array<{ orden: (typeof candidatas)[number]; pi: Stripe.PaymentIntent }> = [];

  for (const orden of candidatas) {
    // stripe_payment_intent_id no es null por el filtro de arriba, pero
    // tsc no lo sabe desde el tipo de la columna.
    const piId = orden.stripe_payment_intent_id;
    if (!piId) continue;

    let pi: Stripe.PaymentIntent;
    try {
      pi = await stripe.paymentIntents.retrieve(piId);
    } catch (error) {
      console.error(`orden ${orden.id}: no se pudo consultar Stripe (${piId}) —`, error);
      continue;
    }

    if (pi.status === "succeeded") {
      cobradaPendiente.push({ orden, pi });
    } else if (pi.status === "canceled") {
      falloEnStripe.push({ orden, pi });
    } else {
      pendienteEnAmbos.push({ orden, pi });
    }
  }

  console.log(`=== Cobradas en Stripe pero pendientes en la base: ${cobradaPendiente.length} ===`);
  for (const { orden } of cobradaPendiente) {
    console.log(
      `  orden ${orden.id} — ${orden.nombre_comprador} <${orden.correo_comprador}> — ${formatearMonto(orden.monto_centavos)} — ${orden.fecha_compra}`
    );
  }

  console.log(`\n=== Pendientes en ambos lados (abandono normal de checkout): ${pendienteEnAmbos.length} ===`);
  for (const { orden, pi } of pendienteEnAmbos) {
    console.log(`  orden ${orden.id} — status Stripe: ${pi.status}`);
  }

  console.log(`\n=== Falladas/canceladas en Stripe: ${falloEnStripe.length} ===`);
  for (const { orden } of falloEnStripe) {
    console.log(`  orden ${orden.id} — no se repara automáticamente, solo se reporta.`);
  }

  if (cobradaPendiente.length === 0) {
    console.log("\nNada que reparar.");
    return;
  }

  console.log(
    `\n${cobradaPendiente.length} orden(es) requieren reparación. Se revisan una por una.\n`
  );

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    for (const { orden, pi } of cobradaPendiente) {
      console.log("\n------------------------------------------------------------");
      console.log(`Orden ${orden.id}`);
      console.log(`  nombre:              ${orden.nombre_comprador}`);
      console.log(`  correo:              ${orden.correo_comprador}`);
      console.log(`  monto en la base:    ${formatearMonto(orden.monto_centavos)}`);
      console.log(`  fecha de compra:     ${orden.fecha_compra}`);
      console.log(`  payment_intent:      ${pi.id}`);
      console.log(`  status en Stripe:    ${pi.status}`);
      console.log(`  amount_received:     ${formatearMonto(pi.amount_received)}`);

      const motivo = (await rl.question("\nMotivo de la reparación (obligatorio): ")).trim();
      if (!motivo) {
        console.log("Motivo vacío. Se omite esta orden, nada se hizo.");
        continue;
      }

      const confirmacion = (await rl.question('Escribe "si" para reparar esta orden: '))
        .trim()
        .toLowerCase();
      if (confirmacion !== "si" && confirmacion !== "sí") {
        console.log("Cancelado. Nada se hizo con esta orden.");
        continue;
      }

      try {
        // Mismo camino que el webhook -- nunca reimplementado aparte.
        const { data: resultado, error: errorRpc } = await supabase.rpc("fn_marcar_orden_pagada", {
          p_payment_intent_id: pi.id,
          p_amount_received_centavos: pi.amount_received,
        });
        if (errorRpc) throw errorRpc;

        const fila = resultado?.[0];
        if (!fila) throw new Error("fn_marcar_orden_pagada no regresó ninguna fila.");

        if (fila.estado === "fallido") {
          console.log(
            `  El monto de Stripe (${formatearMonto(pi.amount_received)}) no coincide con el de la orden -- marcada 'fallido', no se genera boleto.`
          );
          await supabase.from("reconciliaciones_orden").insert({
            orden_id: orden.id,
            estado_stripe: pi.status,
            motivo,
            resultado: "ok",
            detalle: `Monto no coincide -- marcada fallido. amount_received=${pi.amount_received}, monto_centavos=${orden.monto_centavos}`,
          });
          continue;
        }

        if (fila.estado === "pagado" && !fila.ya_estaba_pagada) {
          await generarYEntregarBoletoDigital(supabase, fila.id);
          console.log(`  Orden marcada 'pagado' y boleto generado/enviado.`);
        } else {
          console.log(`  La orden ya estaba pagada -- no se generó un boleto nuevo (idempotente).`);
        }

        await supabase.from("reconciliaciones_orden").insert({
          orden_id: orden.id,
          estado_stripe: pi.status,
          motivo,
          resultado: "ok",
          detalle: `Reparada. ya_estaba_pagada=${fila.ya_estaba_pagada}`,
        });
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : String(error);
        console.error(`  Error reparando la orden ${orden.id}:`, mensaje);
        await supabase.from("reconciliaciones_orden").insert({
          orden_id: orden.id,
          estado_stripe: pi.status,
          motivo,
          resultado: "error",
          detalle: mensaje,
        });
      }
    }
  } finally {
    rl.close();
  }

  console.log("\nListo.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
