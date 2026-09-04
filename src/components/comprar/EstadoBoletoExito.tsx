"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FormAlert } from "@/components/FormAlert";

type EstadoOrden = "pendiente" | "pagado" | "fallido";
type FaseUI = "sin_referencia" | "consultando" | "esperando" | "listo" | "fallido" | "tardando" | "error";

const INTERVALO_POLLING_MS = 3000;
// ~30 intentos * 3s = 90s. Suficiente margen sobre lo que tarda Stripe en
// entregar el webhook en el caso normal; pasado esto, seguir reintentando
// en silencio solo confundiría a alguien que ya se está por ir de la
// página -- mejor decirle explícitamente qué hacer.
const MAX_INTENTOS_POLLING = 30;

export function EstadoBoletoExito({ paymentIntentId }: { paymentIntentId: string | null }) {
  const [fase, setFase] = useState<FaseUI>(paymentIntentId ? "consultando" : "sin_referencia");
  const [descargando, setDescargando] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);
  const intentosRef = useRef(0);

  // "Es un estado final" -- true en cuanto no hace falta seguir
  // preguntando. Devuelve la SIGUIENTE fase en vez de leer/escribir el
  // estado de React desde dentro de un setTimeout encadenado, para no
  // depender de un valor de `fase` potencialmente obsoleto capturado por
  // el closure del ciclo anterior.
  const consultarEstado = useCallback(async (): Promise<FaseUI> => {
    if (!paymentIntentId) return "sin_referencia";

    try {
      const respuesta = await fetch(
        `/api/comprar/estado-orden?payment_intent=${encodeURIComponent(paymentIntentId)}`
      );
      const cuerpo = await respuesta.json().catch(() => null);

      if (!respuesta.ok) return "error";

      const estado = cuerpo?.estado as EstadoOrden | undefined;
      const boletoListo = Boolean(cuerpo?.boletoListo);

      if (estado === "fallido") return "fallido";
      if (estado === "pagado" && boletoListo) return "listo";

      intentosRef.current += 1;
      return intentosRef.current >= MAX_INTENTOS_POLLING ? "tardando" : "esperando";
    } catch {
      return "error";
    }
  }, [paymentIntentId]);

  useEffect(() => {
    if (!paymentIntentId) return;

    let cancelado = false;
    let temporizador: ReturnType<typeof setTimeout> | null = null;

    async function ciclo() {
      const siguiente = await consultarEstado();
      if (cancelado) return;
      setFase(siguiente);

      // Solo se reprograma otra consulta si el estado sigue siendo
      // "esperando" -- "listo", "fallido", "tardando" y "error" son todos
      // estados finales para el polling (el usuario ya tiene algo
      // accionable en pantalla, seguir preguntando cada 3s no aporta nada
      // y solo gasta su cupo de límite de peticiones).
      if (siguiente === "esperando") {
        temporizador = setTimeout(ciclo, INTERVALO_POLLING_MS);
      }
    }

    ciclo();

    return () => {
      cancelado = true;
      if (temporizador) clearTimeout(temporizador);
    };
  }, [paymentIntentId, consultarEstado]);

  async function onDescargar() {
    if (!paymentIntentId) return;
    setDescargando(true);
    setErrorDescarga(null);

    try {
      const respuesta = await fetch(
        `/api/comprar/descargar-boleto?payment_intent=${encodeURIComponent(paymentIntentId)}`
      );
      const cuerpo = await respuesta.json().catch(() => null);

      if (!respuesta.ok || !cuerpo?.url) {
        setErrorDescarga(cuerpo?.error ?? "No se pudo generar la descarga. Intenta de nuevo.");
        setDescargando(false);
        return;
      }

      // La URL firmada ya fuerza Content-Disposition: attachment
      // (descargar-boleto/route.ts) -- navegar ahí basta para que el
      // navegador descargue el PDF, sin abrir una pestaña nueva en blanco.
      window.location.href = cuerpo.url;
      setDescargando(false);
    } catch {
      setErrorDescarga("No se pudo generar la descarga. Intenta de nuevo.");
      setDescargando(false);
    }
  }

  if (fase === "sin_referencia") {
    return (
      <p className="mt-8 rounded-xl border border-dashed border-white/20 p-8 text-sm text-slate-400">
        Recibimos tu pago. Si el código de verificación llegó a tu correo, tu boleto llegará ahí en
        cuanto quede confirmado.
      </p>
    );
  }

  if (fase === "listo") {
    return (
      <div className="mt-8 flex flex-col items-center gap-4">
        <FormAlert tipo="exito" mensaje="Tu boleto ya está listo." />
        <button
          type="button"
          onClick={onDescargar}
          disabled={descargando}
          className="rounded-lg bg-dorado px-6 py-2.5 text-sm font-semibold text-navy disabled:opacity-60"
        >
          {descargando ? "Preparando descarga..." : "Descargar boleto"}
        </button>
        {errorDescarga && <FormAlert tipo="error" mensaje={errorDescarga} />}
        <p className="text-xs text-slate-400">
          También te lo enviamos por correo electrónico, junto con tu folio y contraseña.
        </p>
      </div>
    );
  }

  if (fase === "fallido") {
    return (
      <FormAlert
        tipo="error"
        mensaje="No pudimos confirmar tu pago. Si el cargo se aplicó en tu banco, contáctanos para resolverlo."
      />
    );
  }

  if (fase === "tardando") {
    return (
      <p className="mt-8 rounded-xl border border-dashed border-white/20 p-8 text-sm text-slate-400">
        Confirmar tu pago está tardando más de lo normal. En cuanto quede listo te llegará por correo
        -- si no llega en unos minutos, contáctanos.
      </p>
    );
  }

  if (fase === "error") {
    return (
      <FormAlert
        tipo="error"
        mensaje="No pudimos consultar el estado de tu compra. Revisa tu correo -- ahí llegará tu boleto en cuanto quede confirmado."
      />
    );
  }

  return <p className="mt-8 text-sm text-slate-400">Confirmando tu pago y generando tu boleto...</p>;
}
