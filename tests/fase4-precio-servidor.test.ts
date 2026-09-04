// CLAUDE.md sección 14, prueba 3: "Cuerpo de compra con precio, tipo o
// es_admin manipulados → el campo se ignora y el valor del servidor
// prevalece."
//
// /api/comprar/crear-checkout-session no tiene NINGÚN campo de precio en su
// schema (src/lib/validation/comprar.ts) -- el precio se calcula siempre
// desde precios_boleto. Esta prueba comprueba tres cosas:
// 1) un campo ajeno como "precioCentavos" hace que la petición completa se
//    rechace (schema .strict()), nunca que se "use con cuidado".
// 2) una petición legítima crea una orden cuyo monto en base de datos
//    coincide exactamente con precios_boleto, sin importar qué tan barato
//    "pida" el cliente.
// 3) "cantidad" es la única excepción deliberada: un boleto por compra, sin
//    excepción -- se acepta y se ignora sin error (nunca 400), sin importar
//    el valor que mande el cliente (positivo, cero, negativo).

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: async () => ({ success: true, retryAfterSeconds: 0 }),
}));
vi.mock("@/lib/turnstile", () => ({
  verifyTurnstile: async () => true,
}));

import { POST } from "@/app/api/comprar/crear-checkout-session/route";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { hoyISO } from "@/lib/precios";
import {
  correoDePrueba,
  crearSesionCompraDePrueba,
  limpiarDatosDePrueba,
  limpiarOrdenesDePrueba,
} from "./helpers";

function requestJson(body: unknown) {
  return new Request("http://localhost/api/comprar/crear-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Fase 4 — prueba 3: el precio del servidor prevalece", () => {
  let correo: string;
  let sesionToken: string;
  let precioVigenteCentavos: number;
  let precioVigenteId: number;

  beforeAll(async () => {
    correo = correoDePrueba("precio");
    sesionToken = await crearSesionCompraDePrueba(correo);

    // Mismo criterio de vigencia que /api/comprar/crear-checkout-session
    // (precio por tramos de fecha: sep $550 / oct $650 / nov $700 MXN) --
    // esta prueba no asume un precio fijo, resuelve el tramo de HOY igual
    // que la ruta real.
    const supabase = createServiceRoleClient();
    const hoy = hoyISO();
    const { data } = await supabase
      .from("precios_boleto")
      .select("id, precio_centavos")
      .eq("tipo_boleto", "digital")
      .eq("categoria", "general")
      .eq("activo", true)
      .lte("vigente_desde", hoy)
      .or(`vigente_hasta.is.null,vigente_hasta.gte.${hoy}`)
      .single();

    precioVigenteId = data!.id;
    precioVigenteCentavos = data!.precio_centavos;
  });

  afterEach(async () => {
    await limpiarOrdenesDePrueba(correo);
  });

  afterAll(async () => {
    await limpiarDatosDePrueba(correo);
  });

  it("rechaza por completo un cuerpo con un campo de precio/rol ajeno al schema", async () => {
    const respuesta = await POST(
      requestJson({
        sesionToken,
        categoria: "general",
        turnstileToken: "token-de-prueba",
        // Campos que un atacante intentaría colar: ninguno existe en el
        // schema -- .strict() debe tirar toda la petición, no solo ignorar
        // estos campos en silencio. (cantidad NO va en esta lista -- a
        // diferencia de estos, sí está declarada en el schema a propósito
        // para ignorarse sin rechazar la petición; ver los casos de abajo.)
        precioCentavos: 1,
        monto_total: 0.01,
        esAdmin: true,
      })
    );

    expect(respuesta.status).toBe(400);

    const supabase = createServiceRoleClient();
    const { data: ordenes } = await supabase
      .from("ordenes_compra")
      .select("id")
      .eq("correo_comprador", correo);

    expect(ordenes ?? []).toHaveLength(0);
  });

  it("cobra el precio de precios_boleto, no lo que sugiera el cliente", async () => {
    const respuesta = await POST(
      requestJson({
        sesionToken,
        nombre: "Prueba Precio Servidor",
        categoria: "general",
        turnstileToken: "token-de-prueba",
      })
    );

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.montoTotalCentavos).toBe(precioVigenteCentavos);

    const supabase = createServiceRoleClient();
    const { data: orden } = await supabase
      .from("ordenes_compra")
      .select("precio_unitario_centavos, monto_centavos, precios_boleto_id, estado")
      .eq("correo_comprador", correo)
      .single();

    // monto_centavos es entero -- comparación exacta, sin el margen de
    // toBeCloseTo que hacía falta cuando la columna era numeric (pesos con
    // decimales) y había que dividir entre 100 para comparar.
    expect(orden!.precio_unitario_centavos).toBe(precioVigenteCentavos);
    expect(orden!.monto_centavos).toBe(precioVigenteCentavos);
    expect(orden!.precios_boleto_id).toBe(precioVigenteId);
    expect(orden!.estado).toBe("pendiente");
  });

  it.each([5, 0, -1])(
    "un boleto por compra: cantidad=%i en el cuerpo se ignora, se cobra el precio de un solo boleto",
    async (cantidad) => {
      const respuesta = await POST(
        requestJson({
          sesionToken,
          nombre: "Prueba Precio Servidor",
          categoria: "general",
          turnstileToken: "token-de-prueba",
          cantidad,
        })
      );

      // cantidad está declarada en el schema a propósito para esto: se
      // acepta (nunca 400) y no tiene ningún efecto -- se cobra siempre el
      // precio de un solo boleto, sin importar qué cantidad mande el
      // cliente (positiva, cero o negativa).
      expect(respuesta.status).toBe(200);
      const cuerpo = await respuesta.json();
      expect(cuerpo.montoTotalCentavos).toBe(precioVigenteCentavos);

      const supabase = createServiceRoleClient();
      const { data: ordenes } = await supabase
        .from("ordenes_compra")
        .select("monto_centavos")
        .eq("correo_comprador", correo);

      // Una sola orden, por el precio de un solo boleto -- nunca cantidad
      // órdenes ni el monto multiplicado.
      const filas = ordenes ?? [];
      expect(filas).toHaveLength(1);
      expect(filas[0]?.monto_centavos).toBe(precioVigenteCentavos);
    }
  );
});
