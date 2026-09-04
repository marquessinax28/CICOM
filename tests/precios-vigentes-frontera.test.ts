// Pruebas de frontera del tramo de precio, contra la base real: en vez de
// simular el reloj del sistema (eso ya lo cubre
// tests/precios-timezone.test.ts para hoyISO() en sí), aquí se inyecta la
// fecha directo en obtenerPrecioVigente() para probar la resolución del
// tramo sin depender de en qué mes real se ejecute la prueba.

import { describe, expect, it } from "vitest";
import { obtenerPrecioVigente } from "@/lib/precios";
import { createServiceRoleClient } from "@/lib/supabase/server";

describe("obtenerPrecioVigente — frontera de tramos por fecha", () => {
  const supabase = createServiceRoleClient();

  it.each([
    ["2026-09-30", 55000], // último día de septiembre
    ["2026-10-01", 65000], // corte sep -> oct
    ["2026-10-31", 65000], // último día de octubre
    ["2026-11-01", 70000], // corte oct -> nov
  ])("%s resuelve a %i centavos", async (fecha, precioEsperado) => {
    const precio = await obtenerPrecioVigente(supabase, "general", fecha);
    expect(precio.precioCentavos).toBe(precioEsperado);
  });
});
