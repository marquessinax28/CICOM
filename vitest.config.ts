import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    // Las pruebas de Fase 4 (sección 14 de CLAUDE.md) llaman rutas de API
    // reales contra la base de datos y hacen verificación de firma con
    // Stripe -- no son ligeras, pero sí deterministas.
    testTimeout: 20_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./tests/server-only-shim.ts"),
    },
  },
});
