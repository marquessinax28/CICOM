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
  // Los clics en las flechas leen este ref (no el estado `activo`) para
  // calcular el siguiente índice: con 38 módulos, un clic rápido varias
  // veces seguidas llegaba antes que el scroll suave + el
  // IntersectionObserver actualizaran `activo`, así que varios clics
  // seguidos apuntaban al mismo índice viejo y "no hacían nada".
  const activoRef = useRef(0);

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
        if (visibles.size > 0) {
          // Cerca del final, la última tarjeta no puede llegar a "snapear"
          // al inicio del contenedor porque ya no queda nada más que
          // desplazar -- ella y sus vecinas quedan visibles juntas, y "la
          // más a la izquierda" ya no es la 38, sino la 36. Si ya no se
          // puede desplazar más a la derecha, se muestra la última tarjeta
          // como activa (es, de hecho, la que está más a la vista).
          const alFinal = contenedor.scrollLeft + contenedor.clientWidth >= contenedor.scrollWidth - 2;
          const indice = alFinal ? items.length - 1 : Math.min(...visibles);
          setActivo(indice);
          activoRef.current = indice;
        }
      },
      { root: contenedor, threshold: 0.6 }
    );

    for (const el of cardRefs.current) {
      if (el) observer.observe(el);
    }

    // El IntersectionObserver solo dispara cuando una tarjeta cruza el
    // umbral -- si las últimas 2-3 ya llevan un rato visibles, los últimos
    // píxeles del scroll suave hasta el tope no cruzan ningún umbral nuevo
    // y "alFinal" nunca se vuelve a evaluar en su posición final real. Este
    // listener de scroll sí ve cada posición, así que corrige el contador
    // en cuanto el contenedor de verdad ya no puede desplazarse más.
    function alLlegarAlFinal() {
      if (!contenedor) return;
      const alFinal = contenedor.scrollLeft + contenedor.clientWidth >= contenedor.scrollWidth - 2;
      if (alFinal) {
        setActivo(items.length - 1);
        activoRef.current = items.length - 1;
      }
    }
    contenedor.addEventListener("scroll", alLlegarAlFinal, { passive: true });

    return () => {
      observer.disconnect();
      contenedor.removeEventListener("scroll", alLlegarAlFinal);
    };
  }, [items.length]);

  function irA(indice: number) {
    const acotado = Math.max(0, Math.min(items.length - 1, indice));
    activoRef.current = acotado;
    cardRefs.current[acotado]?.scrollIntoView({
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

      {/* Flechas en vez de un punto por módulo -- con 38 módulos, un punto
          por tarjeta desbordaba y varios "no hacían nada" visible porque
          esa tarjeta ya estaba en pantalla junto con las vecinas. */}
      {items.length > 1 && (
        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => irA(activoRef.current - 1)}
            disabled={activo === 0}
            aria-label="Módulo anterior"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-slate-300 transition-colors hover:border-dorado hover:text-dorado disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/20 disabled:hover:text-slate-300"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="m15 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="text-sm tabular-nums text-slate-400">
            {activo + 1} / {items.length}
          </span>
          <button
            type="button"
            onClick={() => irA(activoRef.current + 1)}
            disabled={activo === items.length - 1}
            aria-label="Siguiente módulo"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-slate-300 transition-colors hover:border-dorado hover:text-dorado disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/20 disabled:hover:text-slate-300"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
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
