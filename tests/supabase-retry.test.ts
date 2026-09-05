// consultarConReintento envuelve las consultas de Supabase usadas en toda
// la home (src/lib/queries/*.ts) y reintenta errores que parecen
// transitorios -- PGRST303 "JWT issued at future" (bug conocido de la
// infraestructura de Supabase,
// https://github.com/orgs/supabase/discussions/48123) y, desde 2026-09-05,
// cualquier 401 sin un código reconocido como permanente (ver retry.ts).
// PGRST300/301 son permanentes por definición -- nunca se reintentan,
// aunque vengan con status 401.

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

  it("reintenta un 401 sin código reconocido (status, no solo error.code) -- el caso real del 500 en la portada", async () => {
    // Sin `error.code` que haga match con nada -- simula una petición
    // rechazada antes de llegar a formarse como un PostgrestError completo.
    // Sin el chequeo de `status`, esto nunca se hubiera reintentado.
    const errorSinCodigo = { message: "Unauthorized" };
    const ejecutar = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: errorSinCodigo, status: 401 })
      .mockResolvedValueOnce({ data: "ok", error: null, status: 200 });

    const resultado = await consultarConReintento(ejecutar);

    expect(resultado).toBe("ok");
    expect(ejecutar).toHaveBeenCalledTimes(2);
  });

  it("NO reintenta PGRST301 aunque el status sea 401 -- es permanente por definición", async () => {
    const errorPermanente = { code: "PGRST301", message: "JWT invalid" };
    const ejecutar = vi.fn().mockResolvedValue({ data: null, error: errorPermanente, status: 401 });

    await expect(consultarConReintento(ejecutar)).rejects.toBe(errorPermanente);
    expect(ejecutar).toHaveBeenCalledTimes(1);
  });

  it("NO reintenta PGRST300 -- sin secreto JWT configurado, también permanente", async () => {
    const errorPermanente = { code: "PGRST300", message: "no active JWT secret" };
    const ejecutar = vi.fn().mockResolvedValue({ data: null, error: errorPermanente, status: 500 });

    await expect(consultarConReintento(ejecutar)).rejects.toBe(errorPermanente);
    expect(ejecutar).toHaveBeenCalledTimes(1);
  });
});
