"use client";

import { useState } from "react";
import Script from "next/script";
import { FormAlert } from "@/components/FormAlert";

type Estado = "inactivo" | "enviando" | "exito" | "error";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function ContactForm() {
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

    const respuesta = await fetch("/api/contacto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: datos.get("nombre"),
        correo: datos.get("correo"),
        mensaje: datos.get("mensaje"),
        turnstileToken: turnstileToken ?? "",
      }),
    });

    if (respuesta.ok) {
      setEstado("exito");
      form.reset();
      return;
    }

    const cuerpo = await respuesta.json().catch(() => null);
    setMensajeError(
      cuerpo?.error ?? "Ocurrió un error al enviar tu mensaje. Intenta de nuevo."
    );
    setIncidentId(cuerpo?.incidentId);
    setEstado("error");
  }

  if (estado === "exito") {
    return <FormAlert tipo="exito" mensaje="Gracias, tu mensaje fue enviado. Te responderemos pronto." />;
  }

  return (
    <>
      {TURNSTILE_SITE_KEY && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
      )}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="nombre" className="block text-sm font-medium">
            Nombre completo
          </label>
          <input
            id="nombre"
            name="nombre"
            required
            maxLength={200}
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-base dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <div>
          <label htmlFor="correo" className="block text-sm font-medium">
            Correo electrónico
          </label>
          <input
            id="correo"
            name="correo"
            type="email"
            required
            maxLength={254}
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-base dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <div>
          <label htmlFor="mensaje" className="block text-sm font-medium">
            Mensaje
          </label>
          <textarea
            id="mensaje"
            name="mensaje"
            required
            maxLength={5000}
            rows={5}
            className="mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-base dark:border-slate-700 dark:bg-slate-900"
          />
        </div>

        {TURNSTILE_SITE_KEY ? (
          <div className="cf-turnstile" data-sitekey={TURNSTILE_SITE_KEY} />
        ) : (
          <p className="text-xs italic text-slate-400 dark:text-slate-500">
            Verificación anti-bot no configurada todavía.
          </p>
        )}

        {mensajeError && <FormAlert tipo="error" mensaje={mensajeError} incidentId={incidentId} />}

        <button
          type="submit"
          disabled={estado === "enviando"}
          className="self-start rounded-lg bg-slate-950 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-slate-950"
        >
          {estado === "enviando" ? "Enviando..." : "Enviar mensaje"}
        </button>
      </form>
    </>
  );
}
