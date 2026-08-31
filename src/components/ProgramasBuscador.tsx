"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeForSearch } from "@/lib/normalize-text";

type Accion =
  | { kind: "externo"; href: string }
  | { kind: "interno"; href: string }
  | { kind: "scroll"; targetId: string };

export type ItemBuscable = {
  id: string;
  tipo: "Módulo" | "Curso o taller" | "Concurso";
  nombre: string;
  subtitulo?: string | null;
  accion: Accion;
};

const MAX_RESULTADOS = 8;

export function ProgramasBuscador({ items }: { items: ItemBuscable[] }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const router = useRouter();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const resultados = useMemo(() => {
    const q = normalizeForSearch(query);
    if (!q) return [];
    return items
      .filter((item) => normalizeForSearch(item.nombre).includes(q))
      .slice(0, MAX_RESULTADOS);
  }, [items, query]);

  function ejecutar(item: ItemBuscable) {
    if (item.accion.kind === "interno") {
      router.push(item.accion.href);
    } else if (item.accion.kind === "externo") {
      window.open(item.accion.href, "_blank", "noopener,noreferrer");
    } else {
      const el = document.getElementById(item.accion.targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-dorado");
        setTimeout(() => el.classList.remove("ring-2", "ring-dorado"), 2000);
      }
    }
    setQuery("");
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
  }

  function onKeyDown(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || resultados.length === 0) return;

    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setActiveIndex((i) => (i + 1) % resultados.length);
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setActiveIndex((i) => (i <= 0 ? resultados.length - 1 : i - 1));
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      const elegido = resultados[activeIndex] ?? resultados[0];
      if (elegido) ejecutar(elegido);
    } else if (evento.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  const activeOptionId =
    activeIndex >= 0 && resultados[activeIndex] ? `${listboxId}-${resultados[activeIndex].id}` : undefined;

  return (
    <div className="relative">
      <label htmlFor={`${listboxId}-input`} className="sr-only">
        Buscar módulos, cursos y concursos
      </label>
      <input
        id={`${listboxId}-input`}
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={isOpen && resultados.length > 0}
        aria-controls={listboxId}
        aria-activedescendant={activeOptionId}
        aria-autocomplete="list"
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        onKeyDown={onKeyDown}
        placeholder="Buscar un módulo, curso o concurso..."
        className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-base text-white placeholder-slate-400 focus:border-dorado focus:outline-none"
      />

      {isOpen && query && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-30 mt-1.5 max-h-80 w-full overflow-y-auto rounded-lg border border-white/10 bg-navy-light py-1 shadow-lg"
        >
          {resultados.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-400">Sin resultados.</li>
          ) : (
            resultados.map((item, i) => (
              <li
                key={item.id}
                id={`${listboxId}-${item.id}`}
                role="option"
                aria-selected={i === activeIndex}
                // onMouseDown, no onClick: dispara antes que el blur del input.
                onMouseDown={() => ejecutar(item)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-sm ${
                  i === activeIndex ? "bg-white/10" : ""
                }`}
              >
                <span>
                  <span className="font-medium text-white">{item.nombre}</span>
                  {item.subtitulo && (
                    <span className="ml-2 text-xs text-slate-400">{item.subtitulo}</span>
                  )}
                </span>
                <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">
                  {item.tipo}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
