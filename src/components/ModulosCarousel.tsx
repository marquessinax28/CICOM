"use client";

import { useEffect, useRef, useState } from "react";
import { PlaceholderImage } from "@/components/PlaceholderImage";

export type ModuloCarrusel = {
  id: number;
  nombre: string;
  subtitulo?: string | null;
  href?: string | null;
  icono?: string | null;
};

// Carrusel de scroll nativo (CSS scroll-snap), sin librería: barato en
// celulares de gama baja y funciona con swipe táctil sin JS. El único JS es
// el IntersectionObserver para resaltar el punto activo y el scrollIntoView
// de los puntos -- ninguno de los dos anima con estilos inline, así que la
// CSP no los bloquea.
export function ModulosCarousel({ items }: { items: ModuloCarrusel[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activo, setActivo] = useState(0);

  useEffect(() => {
    const contenedor = containerRef.current;
    if (!contenedor) return;

    // Con 3+ tarjetas visibles a la vez, varias cruzan el umbral al mismo
    // tiempo -- la activa es la más a la izquierda (la que está "snapeada"),
    // no la última que el observer procese en el batch.
    const visibles = new Set<number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const indice = cardRefs.current.findIndex((el) => el === entry.target);
          if (indice === -1) continue;
          if (entry.isIntersecting) visibles.add(indice);
          else visibles.delete(indice);
        }
        if (visibles.size > 0) setActivo(Math.min(...visibles));
      },
      { root: contenedor, threshold: 0.6 }
    );

    for (const el of cardRefs.current) {
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [items.length]);

  function irA(indice: number) {
    cardRefs.current[indice]?.scrollIntoView({
      behavior: "smooth",
      inline: "start",
      block: "nearest",
    });
  }

  return (
    <div>
      <div
        ref={containerRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) => (
          <div
            key={item.id}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            className="w-[78%] shrink-0 snap-start sm:w-[45%] lg:w-[31%]"
          >
            <TarjetaModulo {...item} />
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <div className="mt-5 flex justify-center gap-2">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => irA(i)}
              aria-label={`Ir a ${item.nombre}`}
              aria-current={i === activo}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === activo ? "bg-dorado" : "bg-white/20"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TarjetaModulo({ nombre, subtitulo, href, icono }: ModuloCarrusel) {
  const contenido = (
    <>
      <div className="relative mx-auto mb-5 h-28 w-28 overflow-hidden rounded-2xl transition-transform group-hover:scale-105 sm:h-32 sm:w-32">
        <PlaceholderImage src={icono ?? null} alt="" sizes="128px" />
      </div>
      <h3 className="text-xl font-bold text-white sm:text-2xl">{nombre}</h3>
      {subtitulo && <p className="mt-1 text-sm text-slate-400">{subtitulo}</p>}
      {!href && <p className="mt-2 text-xs italic text-slate-500">Archivo próximamente</p>}
    </>
  );

  const clases = "group flex h-full flex-col items-center text-center";

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={clases}>
        {contenido}
      </a>
    );
  }

  return <div className={clases}>{contenido}</div>;
}
