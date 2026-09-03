// `server-only` está diseñado para tirar un error a propósito a menos que el
// bundler (Next.js) lo intercepte con una condición de resolución especial
// cuando compila el grafo del servidor. Vitest no es ese bundler -- así que
// aquí se sustituye por un módulo vacío, exactamente lo que Next.js hace en
// su propio build de servidor. No debilita la protección real: esa protección
// solo importa cuando el código termina en el bundle del NAVEGADOR, y estas
// pruebas nunca empaquetan nada para el navegador.
export {};
