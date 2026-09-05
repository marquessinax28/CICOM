"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { FormAlert } from "@/components/FormAlert";

type Estado = "inactivo" | "enviando" | "error";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function AdminLoginForm() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>("inactivo");
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [incidentId, setIncidentId] = useState<string | undefined>(undefined);

  async function onSubmit(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEstado("enviando");
    setMensajeError(null);
    setIncidentId(undefined);

    const form = evento.currentTarget;
    const datos = new FormData(form);
    const turnstileToken = datos.get("cf-turnstile-response");

    const respuesta = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usuario: datos.get("usuario"),
        password: datos.get("password"),
        turnstileToken: turnstileToken ?? "",
      }),
    });

    if (respuesta.ok) {
      router.push("/admin");
      router.refresh();
      return;
    }

    const cuerpo = await respuesta.json().catch(() => null);
    setMensajeError(cuerpo?.error ?? "Ocurrió un error al iniciar sesión. Intenta de nuevo.");
    setIncidentId(cuerpo?.incidentId);
    setEstado("error");
  }

  return (
    <>
      {TURNSTILE_SITE_KEY && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      )}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="usuario" className="block text-sm font-medium text-slate-200">
            Usuario
          </label>
          <input
            id="usuario"
            name="usuario"
            required
            maxLength={50}
            autoComplete="username"
            className="mt-1.5 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-base text-white focus:border-dorado focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-200">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            maxLength={200}
            autoComplete="current-password"
            className="mt-1.5 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-base text-white focus:border-dorado focus:outline-none"
          />
        </div>

        {TURNSTILE_SITE_KEY ? (
          <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} />
        ) : (
          <p className="text-xs italic text-slate-500">
            Verificación anti-bot no configurada todavía.
          </p>
        )}

        {mensajeError && <FormAlert tipo="error" mensaje={mensajeError} incidentId={incidentId} />}

        <button
          type="submit"
          disabled={estado === "enviando"}
          className="rounded-lg bg-dorado px-6 py-2.5 text-sm font-semibold text-navy disabled:opacity-60"
        >
          {estado === "enviando" ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </>
  );
}
