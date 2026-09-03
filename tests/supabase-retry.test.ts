// consultarConReintento envuelve las consultas de Supabase usadas en toda
// la home (src/lib/queries/*.ts) y reintenta SOLO el error transitorio
// PGRST303 "JWT issued at future" -- un bug conocido de la infraestructura
// de Supabase (https://github.com/orgs/supabase/discussions/48123), nunca
// otros errores reales de la aplicación.

import { describe, expect, it, vi } from "vitest";
import { consultarConReintento } from "@/lib/supabase/retry";

describe("consultarConReintento", () => {
  it("regresa data directo cuando no hay error", async () => {
    const ejecutar = vi.fn().mockResolvedValue({ data: [1, 2, 3], error: null });

    const resultado = await consultarConReintento(ejecutar);

    expect(resultado).toEqual([1, 2, 3]);
    expect(ejecutar).toHaveBeenCalledTimes(1);
  });

  it("reintenta en PGRST303 y regresa data si un intento posterior tiene éxito", async () => {
    const ejecutar = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { code: "PGRST303", message: "JWT issued at future" } })
      .mockResolvedValueOnce({ data: "ok", error: null });

    const resultado = await consultarConReintento(ejecutar);

    expect(resultado).toBe("ok");
    expect(ejecutar).toHaveBeenCalledTimes(2);
  });

  it("no reintenta un error que no sea PGRST303 -- falla en el primer intento", async () => {
    const errorReal = { code: "42501", message: "permission denied for table x" };
    const ejecutar = vi.fn().mockResolvedValue({ data: null, error: errorReal });

    await expect(consultarConReintento(ejecutar)).rejects.toBe(errorReal);
    expect(ejecutar).toHaveBeenCalledTimes(1);
  });

  it("se rinde después del máximo de reintentos si PGRST303 persiste", async () => {
    const errorPersistente = { code: "PGRST303", message: "JWT issued at future" };
    const ejecutar = vi.fn().mockResolvedValue({ data: null, error: errorPersistente });

    await expect(consultarConReintento(ejecutar)).rejects.toBe(errorPersistente);
    // 1 intento inicial + 2 reintentos = 3 llamadas en total.
    expect(ejecutar).toHaveBeenCalledTimes(3);
  });
});
