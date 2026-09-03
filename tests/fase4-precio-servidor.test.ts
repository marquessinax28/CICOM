// CLAUDE.md sección 14, prueba 3: "Cuerpo de compra con precio, tipo o
// es_admin manipulados → el campo se ignora y el valor del servidor
// prevalece."
//
// /api/comprar/crear-checkout-session no tiene NINGÚN campo de precio en su
// schema (src/lib/validation/comprar.ts) -- el precio se calcula siempre
// desde precios_boleto. Esta prueba comprueba las dos caras de esa regla:
// 1) un campo ajeno como "precioCentavos" hace que la petición completa se
//    rechace (schema .strict()), nunca que se "use con cuidado".
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

  beforeAll(async () => {
    correo = correoDePrueba("precio");
    sesionToken = await crearSesionCompraDePrueba(correo);

    const supabase = createServiceRoleClient();
    const { data } = await supabase
      .from("precios_boleto")
      .select("precio_centavos")
      .eq("tipo_boleto", "digital")
      .eq("categoria", "general")
      .eq("activo", true)
      .single();

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
        cantidad: 1,
        turnstileToken: "token-de-prueba",
        // Campos que un atacante intentaría colar: ninguno existe en el
        // schema -- .strict() debe tirar toda la petición, no solo ignorar
        // estos campos en silencio.
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
    const cantidad = 2;

    const respuesta = await POST(
      requestJson({
        sesionToken,
        categoria: "general",
        cantidad,
        turnstileToken: "token-de-prueba",
      })
    );

    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.montoTotalCentavos).toBe(precioVigenteCentavos * cantidad);

    const supabase = createServiceRoleClient();
    const { data: orden } = await supabase
      .from("ordenes_compra")
      .select("precio_unitario_centavos, monto_total, cantidad_boletos, estado")
      .eq("correo_comprador", correo)
      .single();

    expect(orden!.precio_unitario_centavos).toBe(precioVigenteCentavos);
    expect(Number(orden!.monto_total)).toBeCloseTo((precioVigenteCentavos * cantidad) / 100, 2);
    expect(orden!.cantidad_boletos).toBe(cantidad);
    expect(orden!.estado).toBe("pendiente");
  });
});
