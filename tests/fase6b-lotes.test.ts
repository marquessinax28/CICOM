// CLAUDE.md sección 14. Este archivo NO ejercita fn_generar_lote_boletos
// contra la base real: lotes_boletos bloquea DELETE sin excepción (es la
// garantía anti-fraude, "ningún rol puede borrarla ni editarla" --
// migración 20260904090500), así que cualquier lote creado por una prueba
// quedaría PARA SIEMPRE en la auditoría real, mezclado con lotes de
// verdad, y consumiría cupo real de fisico/beca_residente/colchon de forma
// permanente -- no hay una base de datos de prueba separada en este
// proyecto (deuda técnica anotada en CLAUDE.md).
//
// Por eso:
//   - Prueba #9 y la de campos ajenos se detienen ANTES de tocar la base
//     (rechazo por rol / por schema) -- cero escritura, seguras de correr
//     las veces que haga falta.
//   - La reautenticación fallida sí toca administradores (increments
//     intentos_fallidos), pero solo en las cuentas de prueba que este
//     archivo crea y borra -- nunca en boletos ni lotes_boletos.
//   - La prueba #11 (segunda descarga de un lote ya descargado) SÍ se
//     escribe, pero contra loteYaDescargado() aislada -- un objeto armado a
//     mano, no un lote real. Es la razón por la que esa función se separó
//     de la consulta a la base en generar-lote.ts.
//   - #11 con un lote real de punta a punta, y la prueba de concurrencia
//     (análoga a la #13 pero para lotes), quedan en verificación MANUAL
//     quy hace el superadmin la primera vez que genere lotes de verdad --
//     documentado aquí, no automatizado, por la razón de arriba.

import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: async () => ({ success: true, retryAfterSeconds: 0 }),
}));

import { POST as generarPOST } from "@/app/api/admin/lotes/generar/route";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { hashPasswordAdmin } from "@/lib/hash";
import { crearSesionAdmin } from "@/lib/admin/sesion";
import { loteYaDescargado } from "@/lib/boletos/generar-lote";

const ORIGEN = "http://localhost:3000";

function requestGenerar(body: unknown, cookie: string) {
  return new Request(`${ORIGEN}/api/admin/lotes/generar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: ORIGEN,
      "Sec-Fetch-Site": "same-origin",
      Cookie: cookie,
    },
    body: JSON.stringify(body),
  });
}

function usuarioDePrueba(etiqueta: string): string {
  return `prueba-lote-${etiqueta}-${Date.now()}`.toLowerCase();
}

describe("Fase 6b — generación de lotes (sin tocar boletos/lotes_boletos reales)", () => {
  const supabase = createServiceRoleClient();
  const cuentasCreadas: number[] = [];

  afterAll(async () => {
    for (const id of cuentasCreadas) {
      await supabase.from("sesiones_admin").delete().eq("administrador_id", id);
      await supabase.from("administradores").delete().eq("id", id);
    }
  });

  async function crearCuentaConSesion(rol: "admin" | "superadmin", password: string) {
    const usuario = usuarioDePrueba(rol);
    const passwordHash = await hashPasswordAdmin(password);
    const { data, error } = await supabase
      .from("administradores")
      .insert({ usuario, nombre: usuario, rol, password_hash: passwordHash })
      .select("id")
      .single();
    if (error) throw error;
    cuentasCreadas.push(data.id);

    const token = await crearSesionAdmin(supabase, data.id);
    return { administradorId: data.id, cookie: `cicom_admin_sesion=${token}` };
  }

  it("CLAUDE.md #9 — endpoint de lotes desde sesión admin (no superadmin) → 403", async () => {
    const password = "password-admin-de-prueba";
    const { cookie } = await crearCuentaConSesion("admin", password);

    const respuesta = await generarPOST(
      requestGenerar({ tipo: "fisico", cantidad: 1, passwordActual: password }, cookie)
    );

    expect(respuesta.status).toBe(403);
    // Confirma que el rechazo fue por rol, no por otra razón -- si esto
    // fallara silenciosamente por otro motivo (ej. sesión inválida), el
    // 403 sería el mismo pero por la razón equivocada.
    const cuerpo = await respuesta.json();
    expect(cuerpo.error).toMatch(/superadmin/i);
  });

  it("cuerpo con campos ajenos (generadoPor, rol) se rechaza por schema -- nunca llega a tocar la base", async () => {
    const password = "password-superadmin-de-prueba";
    const { cookie } = await crearCuentaConSesion("superadmin", password);

    const respuesta = await generarPOST(
      requestGenerar(
        {
          tipo: "fisico",
          cantidad: 1,
          passwordActual: password,
          generadoPor: 999999,
          rol: "superadmin",
        },
        cookie
      )
    );

    expect(respuesta.status).toBe(400);
  });

  it("reautenticación con contraseña incorrecta rechaza sin generar nada", async () => {
    const password = "password-superadmin-reauth";
    const { cookie } = await crearCuentaConSesion("superadmin", password);

    const respuesta = await generarPOST(
      requestGenerar(
        { tipo: "fisico", cantidad: 1, passwordActual: "esta-no-es-la-contraseña" },
        cookie
      )
    );

    expect(respuesta.status).toBe(400);
    const cuerpo = await respuesta.json();
    expect(cuerpo.error).toMatch(/contraseña/i);
  });

  it("CLAUDE.md #11 — loteYaDescargado() niega una segunda descarga (objeto armado a mano, sin lote real)", () => {
    const loteSinDescargar = { pdf_descargado: false, excel_descargado: false };
    const lotePdfYaDescargado = { pdf_descargado: true, excel_descargado: false };
    const loteExcelYaDescargado = { pdf_descargado: false, excel_descargado: true };

    expect(loteYaDescargado(loteSinDescargar, "pdf")).toBe(false);
    expect(loteYaDescargado(loteSinDescargar, "xlsx")).toBe(false);

    expect(loteYaDescargado(lotePdfYaDescargado, "pdf")).toBe(true);
    // El PDF ya descargado no afecta si el Excel del MISMO lote sigue
    // disponible -- son entregas únicas independientes.
    expect(loteYaDescargado(lotePdfYaDescargado, "xlsx")).toBe(false);

    expect(loteYaDescargado(loteExcelYaDescargado, "xlsx")).toBe(true);
    expect(loteYaDescargado(loteExcelYaDescargado, "pdf")).toBe(false);
  });
});
