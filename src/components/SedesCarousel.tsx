"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SLIDES = [
  {
    src: "/sedes/cucs.jpg",
    alt: "CUCS",
    width: 2200,
    height: 1466,
    // object-[50%_88%]: en pantallas anchas y bajas el recorte vertical es
    // fuerte y con el centro por defecto se cortaba el letrero rojo "CUCS"
    // del edificio -- este punto lo mantiene completo dentro del recuadro.
    posicion: "object-[50%_88%]",
    nombre: "Centro Universitario de Ciencias de la Salud",
    direccion: "Sierra Mojada 950, Independencia Oriente, 44340 Guadalajara, Jal.",
    mapsUrl: "https://maps.app.goo.gl/86XBE5qDjNJHePm88",
  },
  {
    src: "/sedes/hcn.jpg",
    alt: "HCN",
    width: 2200,
    height: 1289,
    // object-[50%_16%]: con el centro por defecto el recuadro visible caía a
    // media altura del mural, cortando la franja de arriba y mostrando de
    // más la vidriera de abajo -- este punto deja el mural completo dentro.
    posicion: "object-[50%_16%]",
    nombre: "Nuevo Hospital Civil de Guadalajara Dr. Juan I. Menchaca",
    direccion: "Salvador Quevedo y Zubieta 750, Independencia Oriente, 44340 Guadalajara, Jal.",
    mapsUrl: "https://maps.app.goo.gl/EVHgofxLnMBKitLv9",
  },
  {
    // hcv3.jpg (no hcv.jpg): esta foto de esta sede ya se reemplazó dos
    // veces (HCV -> HCV2 -> HCV3) reutilizando el mismo nombre de archivo, y
    // tanto el navegador como el CDN de Vercel cachean por URL -- quien ya
    // hubiera visitado el sitio seguía viendo la foto vieja aunque el
    // archivo en el servidor ya fuera otro. Un nombre nuevo por foto evita
    // el problema de raíz. Si se vuelve a cambiar esta foto, usar hcv4.jpg,
    // etc. -- nunca reescribir hcv3.jpg con otra imagen.
    src: "/sedes/hcv3.jpg",
    alt: "HCV",
    width: 2200,
    height: 1467,
    // object-[50%_15%]: en pantallas anchas y bajas (contenedor mucho más
    // ancho que la foto) object-center recortaba las manos alzadas de arriba
    // y mostraba de más la escena de la cadena/bebé de abajo -- este punto
    // deja completas las manos, el arcoíris y la cúpula central.
    posicion: "object-[50%_15%]",
    nombre: "Antiguo Hospital Civil de Guadalajara Fray Antonio Alcalde",
    direccion: "Calle Hospital 278, Centro Barranquitas, 44280 Guadalajara, Jal.",
    mapsUrl: "https://maps.app.goo.gl/od4yBcCe6E35iqjG7",
  },
];

const INTERVALO_MS = 20000;

export function SedesCarousel() {
  const [activo, setActivo] = useState(0);

  // Se reinicia cada vez que `activo` cambia -- también cuando el cambio
  // vino de un clic manual en los puntos, para que no se sienta que "salta"
  // a la siguiente justo después de que alguien eligió una.
  useEffect(() => {
    const id = setInterval(() => {
      setActivo((i) => (i + 1) % SLIDES.length);
    }, INTERVALO_MS);
    return () => clearInterval(id);
  }, [activo]);

  return (
    <div className="relative h-72 w-full overflow-hidden sm:h-96 md:h-[30rem]">
      {SLIDES.map((slide, i) => {
        const visible = i === activo;
        return (
          <div
            key={slide.src}
            aria-hidden={!visible}
            className={`absolute inset-0 transition-opacity duration-1000 motion-reduce:transition-none ${
              visible ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              width={slide.width}
              height={slide.height}
              priority={i === 0}
              sizes="100vw"
              className={`h-full w-full object-cover ${slide.posicion}`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/10 to-transparent" />
            <div className="absolute inset-x-4 bottom-11 max-w-xl sm:inset-x-8 sm:bottom-14">
              <h3 className="text-lg font-semibold text-white sm:text-xl">{slide.nombre}</h3>
              <p className="mt-1 text-sm text-slate-300">{slide.direccion}</p>
              <a
                href={slide.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={visible ? 0 : -1}
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-dorado underline underline-offset-4 hover:opacity-80"
              >
                Ver en Google Maps
              </a>
            </div>
          </div>
        );
      })}

      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 sm:bottom-6 sm:left-8">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            onClick={() => setActivo(i)}
            aria-label={`Ir a ${slide.alt}`}
            aria-current={i === activo}
            className={`h-2.5 rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.6)] transition-all duration-300 ${
              i === activo ? "w-6 bg-dorado" : "w-2.5 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
