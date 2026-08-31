"use client";

import { useEffect } from "react";
import { FormAlert } from "@/components/FormAlert";

export default function ErrorPublico({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // El detalle completo ya lo captura Next.js del lado del servidor bajo
    // error.digest; aquí solo confirmamos que se disparó, sin duplicar el
    // detalle técnico hacia el cliente (CLAUDE.md sección 7).
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <FormAlert
        tipo="error"
        mensaje="Ocurrió un error al cargar esta página. Intenta de nuevo."
        incidentId={error.digest}
      />
      <button
        onClick={reset}
        className="mt-4 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white"
      >
        Reintentar
      </button>
    </div>
  );
}
