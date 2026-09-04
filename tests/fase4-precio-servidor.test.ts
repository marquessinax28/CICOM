// CLAUDE.md sección 14, prueba 3: "Cuerpo de compra con precio, tipo o
// es_admin manipulados → el campo se ignora y el valor del servidor
// prevalece."
//
// /api/comprar/crear-checkout-session no tiene NINGÚN campo de precio en su
// schema (src/lib/validation/comprar.ts) -- el precio se calcula siempre
// desde precios_boleto. Esta prueba comprueba las dos caras de esa regla:
// 1) un campo ajeno como "precioCentavos" (o "cantidad" -- un boleto por
//    compra, sin excepción) hace que la petición completa se rechace
//    (schema .strict()), nunca que se "use con cuidado".
// 2) una petición legítima crea una orden cuyo monto en base de datos
//    coincide exactamente con precios_boleto, sin importar qué tan barato
//    "pida" el cliente.

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

  it("rechaza por completo un cuerpo con un campo de precio/rol/cantidad ajeno al schema", async () => {
    const respuesta = await POST(
      requestJson({
        sesionToken,
        categoria: "general",
        turnstileToken: "token-de-prueba",
        // Campos que un atacante intentaría colar: ninguno existe en el
        // schema -- .strict() debe tirar toda la petición, no solo ignorar
        // estos campos en silencio. cantidad tampoco existe: un boleto
        // digital por compra, sin excepción (decisión del comité).
        precioCentavos: 1,
        monto_total: 0.01,
        esAdmin: true,
        cantidad: 5,
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

  it("un boleto por compra: cantidad en el cuerpo no cambia lo que se cobra (se rechaza la petición completa)", async () => {
    const respuesta = await POST(
      requestJson({
        sesionToken,
        categoria: "general",
        turnstileToken: "token-de-prueba",
        cantidad: 5,
      })
    );

    // No existe un modo "ignorar cantidad y cobrar un boleto": el schema
    // no tiene ese campo, así que .strict() rechaza la petición completa
    // -- más estricto que "ignorarlo en silencio", nunca se llega a crear
    // un PaymentIntent con este cuerpo.
    expect(respuesta.status).toBe(400);

    const supabase = createServiceRoleClient();
    const { data: ordenes } = await supabase
      .from("ordenes_compra")
      .select("id")
      .eq("correo_comprador", correo);

    expect(ordenes ?? []).toHaveLength(0);
  });
});
