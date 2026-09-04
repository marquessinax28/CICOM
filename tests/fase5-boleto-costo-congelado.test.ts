// El boleto debe mostrar SIEMPRE ordenes_compra.monto_centavos -- el monto
// que esa persona realmente pagó, congelado al momento de la compra --
// nunca el resultado de obtenerPrecioVigente() ni de precios_boleto en el
// momento de generar el PDF. Si el boleto se genera (o se regenera) después
// de que el tramo de precio cambió, debe seguir mostrando lo que se cobró.
//
// Esta prueba crea una orden pagada con el precio de septiembre, confirma
// que octubre ya resuelve a un precio distinto (para que el escenario sea
// real, no una coincidencia), y verifica que el PDF generado a partir de
// esa orden sigue mostrando el monto de septiembre.

import { afterAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PDFParse } from "pdf-parse";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { obtenerPrecioVigente } from "@/lib/precios";
import { generarPdfBoletoDigital } from "@/lib/boletos/pdf-boleto-digital";
import { correoDePrueba, limpiarOrdenesDePrueba } from "./helpers";

const RUTA_PLANTILLA = path.resolve("Imagenes/Boleto/Diseño boleto imagen.png");

describe("Fase 5 — el boleto muestra el monto congelado de la orden, no el precio vigente", () => {
  const correo = correoDePrueba("costo-congelado");
  const paymentIntentId = `pi_prueba_costo_congelado_${Date.now()}`;

  afterAll(async () => {
    await limpiarOrdenesDePrueba(correo);
  });

  it("una orden pagada en septiembre sigue mostrando $550.00 aunque el tramo vigente ya sea el de octubre", async () => {
    const supabase = createServiceRoleClient();

    // El precio real de septiembre, resuelto igual que lo hace
    // crear-checkout-session en el momento de la compra.
    const precioSeptiembre = await obtenerPrecioVigente(supabase, "general", "2026-09-15");
    expect(precioSeptiembre.precioCentavos).toBe(55000);

    // Canario: si el generador de boletos alguna vez llamara por error a
    // obtenerPrecioVigente() con la fecha de HOY en vez de leer el monto
    // ya congelado en la orden, obtendría un precio distinto -- esta
    // aserción demuestra que el escenario de la prueba es real, no que
    // septiembre y octubre coincidan por accidente.
    const precioOctubre = await obtenerPrecioVigente(supabase, "general", "2026-10-15");
    expect(precioOctubre.precioCentavos).toBe(65000);
    expect(precioOctubre.precioCentavos).not.toBe(precioSeptiembre.precioCentavos);

    // Orden pagada en septiembre: el monto queda congelado en
    // ordenes_compra.monto_centavos al momento de la compra, junto con la
    // fila de precios_boleto que aplicó (auditoría).
    const { data: orden, error } = await supabase
      .from("ordenes_compra")
      .insert({
        nombre_comprador: "Prueba Costo Congelado",
        correo_comprador: correo,
        monto_centavos: precioSeptiembre.precioCentavos,
        estado: "pagado",
        categoria: "general",
        precio_unitario_centavos: precioSeptiembre.precioCentavos,
        precios_boleto_id: precioSeptiembre.id,
        stripe_payment_intent_id: paymentIntentId,
      })
      .select("id")
      .single();
    if (error) throw error;

    // "Se adelanta la fecha a octubre": no se cambia el reloj del sistema
    // (obtenerPrecioVigente ya prueba fronteras de fecha por separado, en
    // precios-vigentes-frontera.test.ts) -- se relee la orden desde la
    // base, exactamente el mismo dato que usará el webhook al generar el
    // boleto (fn_marcar_orden_pagada -> generarPdfBoletoDigital), sin
    // importar qué tramo de precios_boleto esté vigente en ese momento.
    const { data: ordenRelectura, error: errorRelectura } = await supabase
      .from("ordenes_compra")
      .select("monto_centavos")
      .eq("id", orden.id)
      .single();
    if (errorRelectura) throw errorRelectura;
    expect(ordenRelectura.monto_centavos).toBe(55000);

    const plantillaPng = readFileSync(RUTA_PLANTILLA);
    const pdfBytes = await generarPdfBoletoDigital(
      {
        folio: "7Q2K9XVCM3ZR",
        password: "8HXPQ2VN",
        nombre: "Prueba Costo Congelado",
        correo,
        // El punto central de la prueba: siempre el monto ya grabado en la
        // orden -- nunca precioOctubre.precioCentavos, nunca una nueva
        // llamada a obtenerPrecioVigente().
        costoCentavos: ordenRelectura.monto_centavos,
      },
      plantillaPng
    );

    const parser = new PDFParse({ data: Buffer.from(pdfBytes) });
    const { text: textoPdf } = await parser.getText();
    await parser.destroy();

    expect(textoPdf).toContain("$550.00");
    expect(textoPdf).not.toContain("$650.00");
  });
});
