// CLAUDE.md sección 14, prueba 13: "Compras concurrentes al llegar al cupo
// de 6,000 -> no se emite el boleto 6,001." Crear 6,000 filas reales solo
// para probar esto sería absurdo -- la garantía que importa es que
// fn_reservar_orden_digital serializa con `SELECT ... FOR UPDATE` sobre
// cupos_boleto ANTES de contar y de insertar (migración
// 20260903090600_orden_monto_centavos_y_precio_ref.sql), y esa garantía es
// la misma sin importar el tamaño del cupo. Esta prueba sube el cupo
// digital temporalmente a (reservas ya contabilizadas ahora mismo + N) y
// dispara más intentos concurrentes que espacio disponible, para que la
// prueba sea determinista sin importar cuántas órdenes reales ya existan
// en la base.
//
// Nota: existe una ventana mínima de carrera entre "contar cuánto hay
// reservado ahora" y "fijar el nuevo cupo" en la que una compra real
// concurrente podría insertarse -- el mismo tipo de dependencia de estado
// compartido que ya tienen el resto de las pruebas de este archivo contra
// la base real (no una base de datos de prueba aislada por corrida).

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { obtenerPrecioVigente } from "@/lib/precios";
import { correoDePrueba, limpiarOrdenesDePrueba } from "./helpers";

const N_PERMITIDAS = 3;
const N_INTENTOS = N_PERMITIDAS + 2; // 2 de más, deben fallar con cupo_agotado

describe("Fase 5 — prueba 13: compras concurrentes al llegar al cupo", () => {
  const supabase = createServiceRoleClient();
  const correos = Array.from({ length: N_INTENTOS }, (_, i) => correoDePrueba(`concurrencia-${i}`));
  let cupoOriginal: number;

  beforeAll(async () => {
    const { data: cupoActual, error: errorCupo } = await supabase
      .from("cupos_boleto")
      .select("cupo_maximo")
      .eq("tipo", "digital")
      .single();
    if (errorCupo) throw errorCupo;
    cupoOriginal = cupoActual.cupo_maximo;

    // Mismo criterio de conteo que fn_reservar_orden_digital: pagadas +
    // pendientes de los últimos 30 minutos.
    const treintaMinAtras = new Date(Date.now() - 30 * 60_000).toISOString();
    const { count: countPagadas, error: errorPagadas } = await supabase
      .from("ordenes_compra")
      .select("id", { count: "exact", head: true })
      .eq("estado", "pagado");
    if (errorPagadas) throw errorPagadas;

    const { count: countPendientesRecientes, error: errorPendientes } = await supabase
      .from("ordenes_compra")
      .select("id", { count: "exact", head: true })
      .eq("estado", "pendiente")
      .gt("fecha_compra", treintaMinAtras);
    if (errorPendientes) throw errorPendientes;

    const reservadoActual = (countPagadas ?? 0) + (countPendientesRecientes ?? 0);

    const { error: errorUpdate } = await supabase
      .from("cupos_boleto")
      .update({ cupo_maximo: reservadoActual + N_PERMITIDAS })
      .eq("tipo", "digital");
    if (errorUpdate) throw errorUpdate;
  });

  afterAll(async () => {
    await supabase.from("cupos_boleto").update({ cupo_maximo: cupoOriginal }).eq("tipo", "digital");
    for (const correo of correos) {
      await limpiarOrdenesDePrueba(correo);
    }
  });

  it(`exactamente ${N_PERMITIDAS} de ${N_INTENTOS} reservas concurrentes tienen éxito; el resto falla con cupo_agotado, y no queda una orden ${N_PERMITIDAS + 1}`, async () => {
    const precio = await obtenerPrecioVigente(supabase, "general");

    const resultados = await Promise.all(
      correos.map((correo) =>
        supabase.rpc("fn_reservar_orden_digital", {
          p_nombre: correo,
          p_correo: correo,
          p_categoria: "general",
          p_precio_unitario_centavos: precio.precioCentavos,
          p_precios_boleto_id: precio.id,
        })
      )
    );

    const exitosas = resultados.filter((r) => !r.error);
    const fallidas = resultados.filter((r) => r.error);

    expect(exitosas.length).toBe(N_PERMITIDAS);
    expect(fallidas.length).toBe(N_INTENTOS - N_PERMITIDAS);
    for (const fallida of fallidas) {
      expect(fallida.error?.message).toContain("cupo_agotado");
    }
  });
});
