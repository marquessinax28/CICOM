const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    // Tailwind v4 escribe su paleta en oklch()/color-mix(), que Safari a
    // veces renderiza mal incluso en versiones que dicen soportarlo (bug
    // documentado, no solo falta de soporte -- por eso un @supports en
    // runtime no es confiable). Este plugin convierte todo a rgb() en
    // tiempo de build: preserve:false para que oklch() nunca llegue al
    // navegador, en ningún navegador.
    "@csstools/postcss-oklab-function": { preserve: false },
    // Mismo motivo: las clases de opacidad de Tailwind (bg-white/95, etc.)
    // usan color-mix(in oklab, ...), que es justo el patrón con bug
    // documentado en Safari. Lo convierte a rgba() plano en build.
    "@csstools/postcss-color-mix-function": { preserve: false },
  },
};

export default config;
