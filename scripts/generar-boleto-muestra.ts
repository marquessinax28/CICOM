/**
 * Genera un PDF de muestra del boleto digital con datos falsos, para
 * validar las coordenadas de plantilla-config.ts contra el PNG real antes
 * de conectar el generador al webhook de Stripe (Fase 5).
 *
 * No toca Supabase ni ningún servicio externo -- lee la plantilla
 * directamente de Imagenes/Boleto/.
 *
 * Uso: npx tsx scripts/generar-boleto-muestra.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { generarPdfBoletoDigital } from "../src/lib/boletos/pdf-boleto-digital";

const RUTA_PLANTILLA = path.resolve("Imagenes/Boleto/Diseño boleto imagen.png");
const RUTA_SALIDA = path.resolve("scripts/output/boleto-muestra.pdf");

async function main() {
  const plantillaPng = readFileSync(RUTA_PLANTILLA);

  const pdfBytes = await generarPdfBoletoDigital(
    {
      folio: "7Q2K9XVCM3ZR",
      password: "8HXPQ2VN",
      // ~40 caracteres, a propósito, para probar el auto-ajuste de fuente.
      nombre: "María Fernanda Contreras Hernández Ruiz",
      // Correo largo, a propósito, mismo motivo.
      correo: "maria.fernanda.contreras.hernandez@hospitalcivil-guadalajara.gob.mx",
      costoCentavos: 65000,
    },
    plantillaPng
  );

  writeFileSync(RUTA_SALIDA, pdfBytes);
  console.log(`PDF de muestra generado en ${RUTA_SALIDA}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
