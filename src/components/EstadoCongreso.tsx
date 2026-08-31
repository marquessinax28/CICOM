"use client";

import { useEffect, useState } from "react";

type Props = {
  fechaInicio: string; // "YYYY-MM-DD"
  fechaFin: string; // "YYYY-MM-DD"
};

// El congreso es en Guadalajara -- horario fijo en -06:00 (América/Ciudad de
// México, sin horario de verano desde 2022) para que la cuenta regresiva
// tenga sentido sin importar la zona horaria del visitante. La BD solo
// guarda la fecha (sin hora); 09:00 de inicio y 20:00 de cierre son
// estimados razonables para un evento de varios días.
function aFechaHora(fechaISO: string, hora: string): Date {
  return new Date(`${fechaISO}T${hora}-06:00`);
}

function calcularFase(
  ahora: Date,
  inicio: Date,
  fin: Date
): { tipo: "cuenta-regresiva"; restanteMs: number } | { tipo: "en-curso" } | { tipo: "finalizado" } {
  if (ahora.getTime() < inicio.getTime()) {
    return { tipo: "cuenta-regresiva", restanteMs: inicio.getTime() - ahora.getTime() };
  }
  if (ahora.getTime() <= fin.getTime()) {
    return { tipo: "en-curso" };
  }
  return { tipo: "finalizado" };
}

function formatearRestante(ms: number): string {
  const segundosTotales = Math.max(0, Math.floor(ms / 1000));
  const dias = Math.floor(segundosTotales / 86400);
  const horas = Math.floor((segundosTotales % 86400) / 3600);
  const minutos = Math.floor((segundosTotales % 3600) / 60);
  const segundos = segundosTotales % 60;
  return `${dias}d ${horas}h ${minutos}m ${segundos}s`;
}

export function EstadoCongreso({ fechaInicio, fechaFin }: Props) {
  const inicio = aFechaHora(fechaInicio, "09:00:00");
  const fin = aFechaHora(fechaFin, "20:00:00");

  // null hasta que el componente monta -- evita que el servidor (con su
  // "ahora") y el cliente (con el suyo) rendericen segundos distintos y
  // disparen un mismatch de hidratación.
  const [ahora, setAhora] = useState<Date | null>(null);

  useEffect(() => {
    setAhora(new Date());
    const id = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!ahora) {
    return <span className="text-lg text-dorado">&nbsp;</span>;
  }

  const fase = calcularFase(ahora, inicio, fin);

  if (fase.tipo === "en-curso") {
    return <span className="text-lg font-semibold text-dorado">¡El congreso ya ha iniciado!</span>;
  }

  if (fase.tipo === "finalizado") {
    return (
      <span className="text-lg text-dorado">
        El congreso ha terminado. ¡Te esperamos el próximo año!
      </span>
    );
  }

  return (
    <span className="text-lg tabular-nums text-dorado">
      Comienza en {formatearRestante(fase.restanteMs)}
    </span>
  );
}
