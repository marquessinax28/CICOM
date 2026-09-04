"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { loadStripe } from "@stripe/stripe-js";
import { FormAlert } from "@/components/FormAlert";
import { PagoStripe } from "@/components/comprar/PagoStripe";
import { TurnstileWidget } from "@/components/TurnstileWidget";

type Paso = "correo" | "codigo" | "seleccion" | "pago";

type Precio = {
  categoria: string;
  precio_centavos: number;
  moneda: string;
  vigente_hasta: string | null;
};

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

function formatearPrecio(centavos: number, moneda: string) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: moneda.toUpperCase(),
  }).format(centavos / 100);
}

// vigente_hasta llega como columna `date` de Postgres (YYYY-MM-DD, sin
// hora). new Date("2026-09-30") se interpretaría como medianoche UTC, y en
// el navegador de alguien en Guadalajara (UTC-6) Intl.DateTimeFormat podría
// mostrar "29 de septiembre" -- el mismo corrimiento que ya se corrigió del
// lado del servidor en hoyISO(). Se arma la fecha como fecha LOCAL a mano
// para evitar ese corrimiento también aquí.
function formatearFecha(fechaISO: string): string {
  const partes = fechaISO.split("-");
  const anio = Number(partes[0]);
  const mes = Number(partes[1]);
  const dia = Number(partes[2]);
  const fecha = new Date(anio, mes - 1, dia);
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long" }).format(fecha);
}

function WidgetTurnstile({ onToken }: { onToken: (token: string) => void }) {
  if (!TURNSTILE_SITE_KEY) {
    return (
      <p className="text-xs italic text-slate-500">
        Verificación anti-bot no configurada todavía.
      </p>
    );
  }
  return <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={onToken} />;
}

export function CompraBoletoForm() {
  const [paso, setPaso] = useState<Paso>("correo");
  const [correo, setCorreo] = useState("");
  const [nombre, setNombre] = useState("");
  const [sesionToken, setSesionToken] = useState("");
  const [precios, setPrecios] = useState<Precio[]>([]);
  const [clientSecret, setClientSecret] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [incidentId, setIncidentId] = useState<string | undefined>(undefined);
  const [turnstileToken, setTurnstileToken] = useState("");

  useEffect(() => {
    if (paso !== "seleccion") return;
    fetch("/api/comprar/precios")
      .then((r) => r.json())
      .then((data) => setPrecios(data.precios ?? []))
      .catch(() => setPrecios([]));
  }, [paso]);

  // Cada paso monta su propio widget de Turnstile (ver TurnstileWidget) --
  // el token de un paso anterior nunca debe sobrevivir al cambio de paso,
  // así que se limpia explícitamente en cada transición de `paso` de abajo
  // (nunca en un efecto: dispararía un re-render en cascada).
  function irAPaso(siguiente: Paso) {
    setTurnstileToken("");
    setPaso(siguiente);
  }

  // Un boleto digital por compra, sin selector de categoría: el precio que
  // se muestra es el mismo que se manda a cobrar (misma fila de
  // /api/comprar/precios), para que nunca puedan desincronizarse.
  const precioVigente = precios[0];

  async function onSolicitarCodigo(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setMensajeError(null);
    setIncidentId(undefined);

    const form = evento.currentTarget;
    const datos = new FormData(form);
    const correoIngresado = String(datos.get("correo") ?? "");

    const respuesta = await fetch("/api/comprar/solicitar-codigo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        correo: correoIngresado,
        turnstileToken,
      }),
    });

    setEnviando(false);

    if (respuesta.ok) {
      setCorreo(correoIngresado);
      irAPaso("codigo");
      return;
    }

    const cuerpo = await respuesta.json().catch(() => null);
    setMensajeError(cuerpo?.error ?? "No se pudo enviar el código. Intenta de nuevo.");
    setIncidentId(cuerpo?.incidentId);
  }

  async function onVerificarCodigo(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setMensajeError(null);
    setIncidentId(undefined);

    const form = evento.currentTarget;
    const datos = new FormData(form);

    const respuesta = await fetch("/api/comprar/verificar-codigo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        correo,
        codigo: String(datos.get("codigo") ?? ""),
        turnstileToken,
      }),
    });

    setEnviando(false);

    const cuerpo = await respuesta.json().catch(() => null);

    if (respuesta.ok && cuerpo?.sesionToken) {
      setSesionToken(cuerpo.sesionToken);
      irAPaso("seleccion");
      return;
    }

    setMensajeError(cuerpo?.error ?? "No se pudo verificar el código. Intenta de nuevo.");
    setIncidentId(cuerpo?.incidentId);
  }

  async function onCrearCheckout(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setMensajeError(null);
    setIncidentId(undefined);

    const respuesta = await fetch("/api/comprar/crear-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sesionToken,
        nombre,
        categoria: precioVigente?.categoria ?? "general",
        turnstileToken,
      }),
    });

    setEnviando(false);

    const cuerpo = await respuesta.json().catch(() => null);

    if (respuesta.ok && cuerpo?.clientSecret) {
      setClientSecret(cuerpo.clientSecret);
      irAPaso("pago");
      return;
    }

    setMensajeError(cuerpo?.error ?? "No se pudo iniciar el pago. Intenta de nuevo.");
    setIncidentId(cuerpo?.incidentId);
  }

  return (
    <div className="flex flex-col gap-6">
      {TURNSTILE_SITE_KEY && (
        // render=explicit: sin esto, el script auto-escanea el DOM en busca
        // de divs `.cf-turnstile` y los renderiza él mismo -- justo el modo
        // implícito que causaba el bug de widgets huérfanos entre pasos.
        // TurnstileWidget llama a window.turnstile.render()/remove() a mano.
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          async
          defer
        />
      )}

      <Pasos actual={paso} />

      {paso === "correo" && (
        <form onSubmit={onSolicitarCodigo} className="flex flex-col gap-4">
          <div>
            <label htmlFor="correo" className="block text-sm font-medium text-slate-200">
              Correo electrónico
            </label>
            <input
              id="correo"
              name="correo"
              type="email"
              required
              maxLength={254}
              className="mt-1.5 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-base text-white focus:border-dorado focus:outline-none"
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Te enviaremos un código de 6 dígitos para confirmar tu correo antes de continuar.
            </p>
          </div>
          <WidgetTurnstile onToken={setTurnstileToken} />
          {mensajeError && <FormAlert tipo="error" mensaje={mensajeError} incidentId={incidentId} />}
          <button
            type="submit"
            disabled={enviando || (Boolean(TURNSTILE_SITE_KEY) && !turnstileToken)}
            className="self-start rounded-lg bg-dorado px-6 py-2.5 text-sm font-semibold text-navy disabled:opacity-60"
          >
            {enviando ? "Enviando..." : "Enviar código"}
          </button>
        </form>
      )}

      {paso === "codigo" && (
        <form onSubmit={onVerificarCodigo} className="flex flex-col gap-4">
          <p className="text-sm text-slate-300">
            Enviamos un código a <span className="font-semibold text-white">{correo}</span>.
          </p>
          <div>
            <label htmlFor="codigo" className="block text-sm font-medium text-slate-200">
              Código de 6 dígitos
            </label>
            <input
              id="codigo"
              name="codigo"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              required
              className="mt-1.5 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-center text-2xl tracking-[0.5em] text-white focus:border-dorado focus:outline-none"
            />
          </div>
          <WidgetTurnstile onToken={setTurnstileToken} />
          {mensajeError && <FormAlert tipo="error" mensaje={mensajeError} incidentId={incidentId} />}
          <button
            type="submit"
            disabled={enviando || (Boolean(TURNSTILE_SITE_KEY) && !turnstileToken)}
            className="self-start rounded-lg bg-dorado px-6 py-2.5 text-sm font-semibold text-navy disabled:opacity-60"
          >
            {enviando ? "Verificando..." : "Verificar código"}
          </button>
          <button
            type="button"
            onClick={() => irAPaso("correo")}
            className="self-start text-sm text-slate-400 underline underline-offset-4 hover:text-slate-200"
          >
            Usar otro correo
          </button>
        </form>
      )}

      {paso === "seleccion" && (
        <form onSubmit={onCrearCheckout} className="flex flex-col gap-4">
          <div className="rounded-lg border border-white/20 bg-white/5 px-4 py-3">
            <p className="text-sm font-medium text-slate-200">Boleto digital</p>
            {precioVigente ? (
              <>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {formatearPrecio(precioVigente.precio_centavos, precioVigente.moneda)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {precioVigente.vigente_hasta
                    ? `Precio vigente hasta el ${formatearFecha(precioVigente.vigente_hasta)}.`
                    : "Precio vigente hasta nuevo aviso."}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-slate-400">Cargando precio...</p>
            )}
          </div>
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-slate-200">
              Nombre completo
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              required
              maxLength={120}
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-base text-white focus:border-dorado focus:outline-none"
            />
            <p className="mt-1.5 text-xs text-slate-400">
              Así aparecerá impreso en tu boleto y en tu certificado.
            </p>
          </div>
          <p className="text-xs text-slate-400">
            Un boleto por compra, ligado al correo{" "}
            <span className="text-slate-300">{correo}</span>. Si quieres varios, repite la compra
            con cada correo.
          </p>
          <WidgetTurnstile onToken={setTurnstileToken} />
          {mensajeError && <FormAlert tipo="error" mensaje={mensajeError} incidentId={incidentId} />}
          <button
            type="submit"
            disabled={
              enviando ||
              !precioVigente ||
              !nombre.trim() ||
              (Boolean(TURNSTILE_SITE_KEY) && !turnstileToken)
            }
            className="self-start rounded-lg bg-dorado px-6 py-2.5 text-sm font-semibold text-navy disabled:opacity-60"
          >
            {enviando ? "Preparando pago..." : "Continuar al pago"}
          </button>
        </form>
      )}

      {paso === "pago" &&
        (stripePromise ? (
          <PagoStripe stripePromise={stripePromise} clientSecret={clientSecret} />
        ) : (
          <FormAlert tipo="error" mensaje="Los pagos no están configurados todavía." />
        ))}
    </div>
  );
}

function Pasos({ actual }: { actual: Paso }) {
  const pasos: { id: Paso; label: string }[] = [
    { id: "correo", label: "Correo" },
    { id: "codigo", label: "Código" },
    { id: "seleccion", label: "Boleto" },
    { id: "pago", label: "Pago" },
  ];
  const indiceActual = pasos.findIndex((p) => p.id === actual);

  return (
    <ol className="flex items-center gap-2 text-xs font-medium text-slate-400">
      {pasos.map((p, i) => (
        <li key={p.id} className="flex items-center gap-2">
          <span
            className={
              i <= indiceActual
                ? "flex h-6 w-6 items-center justify-center rounded-full bg-dorado text-navy"
                : "flex h-6 w-6 items-center justify-center rounded-full border border-white/20 text-slate-400"
            }
          >
            {i + 1}
          </span>
          <span className={i === indiceActual ? "text-white" : ""}>{p.label}</span>
          {i < pasos.length - 1 && <span className="mx-1 text-slate-600">—</span>}
        </li>
      ))}
    </ol>
  );
}
