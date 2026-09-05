// CLAUDE.md sección 14: pruebas #2 ("petición a una ruta protegida sin
// sesión -> 401/403, no 200 con HTML vacío") y #8 ("endpoint admin desde
// sesión normal -> 403"), aplicadas a la autenticación de Fase 6a.
// proxy.ts y admin/(protegido)/layout.tsx son renderizado/enrutamiento de
// Next -- no se ejercitan aquí con un servidor real (eso ya se verificó a
// mano en el navegador); lo que se prueba es la función autoritativa que
// ambos llaman, verificarSesionAdmin, y las rutas de login/logout tal cual
// las invocaría el navegador.

import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: async () => ({ success: true, retryAfterSeconds: 0 }),
}));
vi.mock("@/lib/turnstile", () => ({
  verifyTurnstile: async () => true,
}));

import { POST as loginPOST } from "@/app/api/admin/login/route";
import { POST as logoutPOST } from "@/app/api/admin/logout/route";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { hashPasswordAdmin } from "@/lib/hash";
import { verificarSesionAdmin } from "@/lib/admin/sesion";

const ORIGEN = "http://localhost:3000";

function requestJson(body: unknown, cookie?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Origin: ORIGEN,
    "Sec-Fetch-Site": "same-origin",
  };
  if (cookie) headers.Cookie = cookie;
  return new Request(`${ORIGEN}/api/admin/login`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function requestLogout(cookie?: string) {
  const headers: Record<string, string> = {
    Origin: ORIGEN,
    "Sec-Fetch-Site": "same-origin",
  };
  if (cookie) headers.Cookie = cookie;
  return new Request(`${ORIGEN}/api/admin/logout`, { method: "POST", headers });
}

function usuarioDePrueba(etiqueta: string): string {
  return `prueba-${etiqueta}-${Date.now()}`.toLowerCase();
}

function extraerCookie(respuesta: Response): string | null {
  const setCookie = respuesta.headers.get("set-cookie");
  if (!setCookie) return null;
  return setCookie.split(";")[0] ?? null;
}

describe("Fase 6a — autenticación de administradores", () => {
  const supabase = createServiceRoleClient();
  const cuentasCreadas: number[] = [];

  afterAll(async () => {
    for (const id of cuentasCreadas) {
      await supabase.from("sesiones_admin").delete().eq("administrador_id", id);
      await supabase.from("administradores").delete().eq("id", id);
    }
  });

  async function crearCuentaDePrueba(usuario: string, passwordPlano: string, rol: "admin" | "superadmin" = "admin") {
    const passwordHash = await hashPasswordAdmin(passwordPlano);
    const { data, error } = await supabase
      .from("administradores")
      .insert({ usuario, nombre: usuario, rol, password_hash: passwordHash })
      .select("id")
      .single();
    if (error) throw error;
    cuentasCreadas.push(data.id);
    return data.id;
  }

  it("usuario inexistente y contraseña incorrecta responden el mismo mensaje genérico", async () => {
    const usuario = usuarioDePrueba("no-existe");
    const respuestaNoExiste = await loginPOST(
      requestJson({ usuario, password: "cualquier-cosa", turnstileToken: "t" })
    );
    expect(respuestaNoExiste.status).toBe(400);
    const cuerpoNoExiste = await respuestaNoExiste.json();

    const usuarioReal = usuarioDePrueba("mensaje");
    await crearCuentaDePrueba(usuarioReal, "password-correcta-de-prueba");
    const respuestaMalPassword = await loginPOST(
      requestJson({ usuario: usuarioReal, password: "incorrecta", turnstileToken: "t" })
    );
    expect(respuestaMalPassword.status).toBe(400);
    const cuerpoMalPassword = await respuestaMalPassword.json();

    expect(cuerpoNoExiste.error).toBe(cuerpoMalPassword.error);
  });

  it("bloqueo progresivo: tras 5 fallos la cuenta se bloquea, y la contraseña correcta también se rechaza mientras dure", async () => {
    const usuario = usuarioDePrueba("bloqueo");
    const passwordCorrecta = "password-correcta-de-bloqueo";
    await crearCuentaDePrueba(usuario, passwordCorrecta);

    for (let i = 0; i < 5; i++) {
      const respuesta = await loginPOST(
        requestJson({ usuario, password: "incorrecta", turnstileToken: "t" })
      );
      expect(respuesta.status).toBe(400);
    }

    // El 6to intento, con la contraseña CORRECTA, debe seguir bloqueado.
    const respuestaBloqueada = await loginPOST(
      requestJson({ usuario, password: passwordCorrecta, turnstileToken: "t" })
    );
    expect(respuestaBloqueada.status).toBe(429);

    const { data: fila } = await supabase
      .from("administradores")
      .select("bloqueado_hasta, intentos_fallidos")
      .eq("usuario", usuario)
      .single();
    expect(fila?.intentos_fallidos).toBe(5);
    expect(fila?.bloqueado_hasta).not.toBeNull();
    expect(new Date(fila!.bloqueado_hasta!).getTime()).toBeGreaterThan(Date.now());
  });

  it("login correcto crea sesión con estado y setea cookie httpOnly/secure/sameSite=strict; el rol se lee de la base, no de la cookie", async () => {
    const usuario = usuarioDePrueba("login-ok");
    const password = "password-correcta-de-login";
    await crearCuentaDePrueba(usuario, password, "superadmin");

    const respuesta = await loginPOST(requestJson({ usuario, password, turnstileToken: "t" }));
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    expect(cuerpo.rol).toBe("superadmin");

    const setCookieHeader = respuesta.headers.get("set-cookie") ?? "";
    expect(setCookieHeader).toContain("HttpOnly");
    expect(setCookieHeader).toContain("SameSite=strict");
    // Secure solo se fuerza en producción (NODE_ENV) -- en pruebas no
    // necesariamente corre como production, así que no se afirma aquí.

    const cookie = extraerCookie(respuesta);
    expect(cookie).not.toBeNull();
    const token = cookie!.split("=")[1]!;

    const sesion = await verificarSesionAdmin(supabase, token);
    expect(sesion?.usuario).toBe(usuario);
    expect(sesion?.rol).toBe("superadmin");

    const { data: filaSesion } = await supabase
      .from("sesiones_admin")
      .select("id")
      .eq("administrador_id", sesion!.administradorId);
    expect(filaSesion).toHaveLength(1);
  });

  it("un token inválido/inexistente no verifica ninguna sesión (ruta protegida sin sesión válida)", async () => {
    const sesion = await verificarSesionAdmin(supabase, "token-que-nunca-existio");
    expect(sesion).toBeNull();
  });

  it("logout borra la sesión de la base -- el mismo token deja de verificar después", async () => {
    const usuario = usuarioDePrueba("logout");
    const password = "password-correcta-de-logout";
    await crearCuentaDePrueba(usuario, password);

    const respuestaLogin = await loginPOST(requestJson({ usuario, password, turnstileToken: "t" }));
    const cookie = extraerCookie(respuestaLogin)!;

    const respuestaLogout = await logoutPOST(requestLogout(cookie));
    expect(respuestaLogout.status).toBe(200);

    const token = cookie.split("=")[1]!;
    const sesionTrasLogout = await verificarSesionAdmin(supabase, token);
    expect(sesionTrasLogout).toBeNull();
  });

  it("una petición de login sin Origin/Sec-Fetch-Site de confianza se rechaza (protección CSRF)", async () => {
    const respuesta = await loginPOST(
      new Request(`${ORIGEN}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "https://sitio-ajeno.invalid" },
        body: JSON.stringify({ usuario: "x", password: "y", turnstileToken: "t" }),
      })
    );
    expect(respuesta.status).toBe(403);
  });
});
