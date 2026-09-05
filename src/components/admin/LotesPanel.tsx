"use client";

import { useCallback, useEffect, useState } from "react";
import { CANTIDAD_MAXIMA_POR_LOTE } from "@/lib/validation/lotes";

type Lote = {
  id: number;
  tipo: string;
  cantidad: number;
  fecha_generacion: string;
  pdf_descargado: boolean;
  excel_descargado: boolean;
  administradores: { nombre: string } | null;
};

type ResultadoGeneracion = {
  loteId: number;
  tipo: string;
  cantidad: number;
  passwordExcel: string;
  cupoMaximo: number;
  generadosTotal: number;
  restante: number;
};

const TIPOS = [
  { value: "fisico", label: "Físico" },
  { value: "beca_residente", label: "Beca residente" },
  { value: "colchon", label: "Colchón" },
];

// Función pura de módulo (sin closures sobre estado de React) -- llamarla
// desde una flecha en línea dentro de un onClick es lo que evita el falso
// positivo de react-hooks/immutability que aparece al invocar una función
// del componente CON PARÁMETROS desde dentro de un .map().
async function pedirDescargaLote(
  loteId: number,
  archivo: "pdf" | "xlsx"
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const respuesta = await fetch(`/api/admin/lotes/${loteId}/descargar?archivo=${archivo}`);
  const cuerpo = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    return { ok: false, error: cuerpo?.error ?? "No se pudo generar el enlace de descarga." };
  }
  return { ok: true, url: cuerpo.url as string };
}

export function LotesPanel({ rol }: { rol: "admin" | "superadmin" }) {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tipo, setTipo] = useState("fisico");
  const [cantidad, setCantidad] = useState(100);
  const [passwordActual, setPasswordActual] = useState("");
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultados, setResultados] = useState<ResultadoGeneracion[]>([]);

  // Reutilizable para refrescar la lista después de generar/descargar (esas
  // llamadas ocurren desde manejadores de evento, no desde un efecto).
  const cargarLotes = useCallback(async () => {
    const respuesta = await fetch("/api/admin/lotes");
    const cuerpo = await respuesta.json().catch(() => ({ lotes: [] }));
    setLotes(cuerpo.lotes ?? []);
    setCargando(false);
  }, []);

  // La carga inicial NO llama a cargarLotes -- el análisis estático de
  // react-hooks marca como "setState directo dentro de un efecto"
  // cualquier setState alcanzable a través de una función memoizada
  // (useCallback) referenciada en las dependencias, sin importar que ese
  // setState esté después de un await. Definiendo el fetch en línea, igual
  // que EstadoBoletoExito.tsx, el analizador sí distingue que el setState
  // ocurre después del await, no de forma síncrona.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const respuesta = await fetch("/api/admin/lotes");
      const cuerpo = await respuesta.json().catch(() => ({ lotes: [] }));
      if (cancelado) return;
      setLotes(cuerpo.lotes ?? []);
      setCargando(false);
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  async function onGenerar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setGenerando(true);
    setError(null);

    const respuesta = await fetch("/api/admin/lotes/generar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, cantidad, passwordActual }),
    });
    const cuerpo = await respuesta.json().catch(() => null);

    if (!respuesta.ok) {
      setError(cuerpo?.error ?? "No se pudo generar el lote.");
      setGenerando(false);
      return;
    }

    setResultados((prev) => [
      {
        loteId: cuerpo.loteId,
        tipo: cuerpo.tipo,
        cantidad: cuerpo.cantidad,
        passwordExcel: cuerpo.passwordExcel,
        cupoMaximo: cuerpo.cupoMaximo,
        generadosTotal: cuerpo.generadosTotal,
        restante: cuerpo.restante,
      },
      ...prev,
    ]);
    setPasswordActual("");
    setGenerando(false);
    await cargarLotes();
  }

  return (
    <div>
      {rol === "superadmin" && (
        <form onSubmit={onGenerar} style={{ marginBottom: "2rem" }}>
          <h2>Generar lote</h2>
          <div>
            <label>
              Tipo{" "}
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <label>
              Cantidad (máximo {CANTIDAD_MAXIMA_POR_LOTE} por tanda){" "}
              <input
                type="number"
                min={1}
                max={CANTIDAD_MAXIMA_POR_LOTE}
                value={cantidad}
                onChange={(e) => setCantidad(Number(e.target.value))}
                required
              />
            </label>
          </div>
          <div>
            <label>
              Tu contraseña (para confirmar){" "}
              <input
                type="password"
                value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
                required
              />
            </label>
          </div>
          {error && <p style={{ color: "red" }}>{error}</p>}
          <button type="submit" disabled={generando}>
            {generando ? "Generando..." : "Generar lote"}
          </button>
        </form>
      )}

      {resultados.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h2>Contraseñas de Excel generadas en esta sesión</h2>
          <p>Cada una se muestra una sola vez -- no queda guardada en ningún lugar.</p>
          <ul>
            {resultados.map((r) => (
              <li key={r.loteId}>
                <strong>Lote #{r.loteId}</strong> ({r.tipo}, {r.cantidad} boletos) — contraseña del
                Excel: <code>{r.passwordExcel}</code>
                <br />
                {r.tipo}: {r.generadosTotal} de {r.cupoMaximo} generados, faltan {r.restante} para
                el cupo.
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2>Lotes generados</h2>
      {cargando ? (
        <p>Cargando...</p>
      ) : lotes.length === 0 ? (
        <p>Todavía no se ha generado ningún lote.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Id</th>
              <th>Tipo</th>
              <th>Cantidad</th>
              <th>Fecha</th>
              <th>Generado por</th>
              {rol === "superadmin" && <th>Archivos</th>}
            </tr>
          </thead>
          <tbody>
            {lotes.map((lote) => (
              <tr key={lote.id}>
                <td>{lote.id}</td>
                <td>{lote.tipo}</td>
                <td>{lote.cantidad}</td>
                <td>{new Date(lote.fecha_generacion).toLocaleString("es-MX")}</td>
                <td>{lote.administradores?.nombre ?? "—"}</td>
                {rol === "superadmin" && (
                  <td>
                    <button
                      type="button"
                      disabled={lote.pdf_descargado}
                      onClick={async () => {
                        const resultado = await pedirDescargaLote(lote.id, "pdf");
                        if (!resultado.ok) {
                          setError(resultado.error);
                          return;
                        }
                        window.location.href = resultado.url;
                        await cargarLotes();
                      }}
                    >
                      {lote.pdf_descargado ? "PDF ya descargado" : "Descargar PDF"}
                    </button>{" "}
                    <button
                      type="button"
                      disabled={lote.excel_descargado}
                      onClick={async () => {
                        const resultado = await pedirDescargaLote(lote.id, "xlsx");
                        if (!resultado.ok) {
                          setError(resultado.error);
                          return;
                        }
                        window.location.href = resultado.url;
                        await cargarLotes();
                      }}
                    >
                      {lote.excel_descargado ? "Excel ya descargado" : "Descargar Excel"}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
