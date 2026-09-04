import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    // Las pruebas de Fase 4/5 (sección 14 de CLAUDE.md) llaman rutas de API
    // reales contra la base de datos y hacen verificación de firma con
    // Stripe -- no son ligeras, pero sí deterministas.
    testTimeout: 20_000,
    // fileParallelism:false -- descubierto con fase5-cupo-concurrencia:
    // esa prueba cuenta filas de ordenes_compra para calibrar un cupo
    // temporal, y con los archivos de prueba corriendo en paralelo (el
    // default de Vitest), otro archivo de prueba insertando/actualizando
    // ordenes_compra AL MISMO TIEMPO produce un conteo movido y una
    // aserción intermitente -- no es un bug de la prueba en sí, es que
    // toda esta suite comparte una sola base real sin aislar transacciones
    // por archivo. Correr los archivos en serie (no cada test individual,
    // que ya corre en serie por defecto) cuesta unos segundos más y
    // elimina la clase completa de carrera entre archivos, no solo la de
    // esta prueba.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./tests/server-only-shim.ts"),
    },
  },
});
