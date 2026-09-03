// Verifica el punto de la auditoría: el tramo de precio se resuelve con la
// fecha LOCAL de Guadalajara, no con UTC. Alguien que compra a las 11 PM
// del 30 de septiembre en Guadalajara (America/Mexico_City, UTC-6 todo el
// año) debe seguir cayendo en septiembre, aunque en UTC ya sean las 5 AM
// del 1 de octubre.

import { afterEach, describe, expect, it, vi } from "vitest";
import { hoyISO } from "@/lib/precios";

describe("hoyISO — corte de tramo en hora local de Guadalajara", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("11 PM del 30 de septiembre en Guadalajara sigue siendo 30 de septiembre", () => {
    // 2026-09-30 23:00 America/Mexico_City (UTC-6) = 2026-10-01 05:00 UTC.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T05:00:00.000Z"));

    expect(hoyISO()).toBe("2026-09-30");
  });

  it("medianoche en punto en Guadalajara ya cae en el nuevo mes", () => {
    // 2026-10-01 00:00 America/Mexico_City (UTC-6) = 2026-10-01 06:00 UTC.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T06:00:00.000Z"));

    expect(hoyISO()).toBe("2026-10-01");
  });

  it("un minuto antes de medianoche en Guadalajara todavía no cambia de mes", () => {
    // 2026-09-30 23:59 America/Mexico_City (UTC-6) = 2026-10-01 05:59 UTC.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T05:59:00.000Z"));

    expect(hoyISO()).toBe("2026-09-30");
  });
});
