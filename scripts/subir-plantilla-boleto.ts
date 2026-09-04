/**
 * Sube la plantilla del boleto digital (PNG) al bucket privado
 * plantillas-boleto, en la ruta que espera pdf-boleto-digital.ts
 * (RUTA_PLANTILLA_BOLETO_DIGITAL). Reejecutable: sube con upsert
 * (sobrescribe en el mismo path, no duplica) -- correr de nuevo después de
 * migración 20260904090000_boletos_buckets_privados.sql, o cada vez que el
 * comité entregue un diseño nuevo.
 *
 * Uso: npx tsx scripts/subir-plantilla-boleto.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile?.(path.resolve(process.cwd(), ".env.local"));

const RUTA_LOCAL = path.resolve("Imagenes/Boleto/Diseño boleto imagen.png");
const BUCKET = "plantillas-boleto";
const RUTA_OBJETO = "boleto-digital.png";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  }
  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

  const archivo = readFileSync(RUTA_LOCAL);

  const { error } = await supabase.storage.from(BUCKET).upload(RUTA_OBJETO, archivo, {
    contentType: "image/png",
    upsert: true,
  });

  if (error) {
    throw error;
  }

  console.log(`Plantilla subida a ${BUCKET}/${RUTA_OBJETO} (${archivo.length} bytes).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
