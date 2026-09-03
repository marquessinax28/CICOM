"use client";

import { useEffect, useRef } from "react";

// Tipos mínimos de la API global que expone
// https://challenges.cloudflare.com/turnstile/v0/api.js -- no hay paquete
// oficial de tipos para el script cargado por <script>, así que se declara
// solo lo que este componente usa.
declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

type Props = {
  siteKey: string;
  onToken: (token: string) => void;
};

// Renderizado EXPLÍCITO (no la clase `cf-turnstile` con auto-detección):
// cada instancia de este componente monta y desmonta su propio widget con
// window.turnstile.render()/remove(). Con el modo implícito, un formulario
// multi-paso (correo -> código) que desmonta el <div class="cf-turnstile">
// del paso anterior dejaba el widget viejo huérfano -- Turnstile seguía
// intentando refrescar su token en segundo plano, no encontraba el
// contenedor en el DOM ("Cannot find Widget ... consider using
// turnstile.remove()") y el formulario del paso 2 terminaba leyendo o
// generando un token que el servidor ya había consumido/invalidado.
export function TurnstileWidget({ siteKey, onToken }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);

  // Mantiene la referencia al día sin tocarla durante el render (regla de
  // React: los refs solo se leen/escriben en efectos o manejadores).
  useEffect(() => {
    onTokenRef.current = onToken;
  });

  useEffect(() => {
    let cancelado = false;
    let intervalo: ReturnType<typeof setInterval> | undefined;

    function intentarRenderizar() {
      if (cancelado || !containerRef.current || !window.turnstile) return;

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(""),
        "error-callback": () => onTokenRef.current(""),
      });

      if (intervalo) {
        clearInterval(intervalo);
        intervalo = undefined;
      }
    }

    // El script se carga con next/script `async defer`: puede que
    // window.turnstile todavía no exista cuando este efecto corre.
    if (window.turnstile) {
      intentarRenderizar();
    } else {
      intervalo = setInterval(intentarRenderizar, 100);
    }

    return () => {
      cancelado = true;
      if (intervalo) clearInterval(intervalo);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, [siteKey]);

  return <div ref={containerRef} />;
}
