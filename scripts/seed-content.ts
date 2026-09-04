/**
 * Siembra modulos, concursos, comite_organizador y la edición actual desde
 * Imagenes/. Reejecutable: sube a Storage con upsert (sobrescribe en el
 * mismo path, no duplica) y en la base de datos hace upsert por nombre
 * (actualiza si existe, inserta si no). Nunca pone en null un campo que no
 * tiene un valor nuevo en esta corrida -- para no borrar contenido que el
 * panel de admin haya llenado después a mano.
 *
 * Uso: npm run seed:contenido
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import sharp from "sharp";

process.loadEnvFile?.(path.resolve(process.cwd(), ".env.local"));

const IMAGENES_DIR = path.resolve(process.cwd(), "Imagenes");
const BUCKET = "contenido-publico";

function crearCliente(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

// ---------- utilidades de texto ----------

function parseListaSimple(raw: string): Array<{ numero: number; texto: string }> {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((linea) => {
      const m = linea.match(/^(\d+)-\s*(.+)$/);
      return m ? { numero: Number(m[1]!), texto: m[2]!.trim() } : null;
    })
    .filter((x): x is { numero: number; texto: string } => x !== null);
}

function parseComite(raw: string): Array<{ numero: number; cargo: string; nombre: string }> {
  const lineas = raw.split(/\r?\n/);
  const resultado: Array<{ numero: number; cargo: string; nombre: string }> = [];
  for (let i = 0; i < lineas.length; i++) {
    const m = lineas[i]!.trim().match(/^(\d+)-\s*(.+)$/);
    if (!m) continue;
    let j = i + 1;
    while (j < lineas.length && lineas[j]!.trim() === "") j++;
    resultado.push({ numero: Number(m[1]!), cargo: m[2]!.trim(), nombre: (lineas[j] ?? "").trim() });
    i = j;
  }
  return resultado;
}

// Erratas evidentes de ortografía médica en el .txt fuente -- no son
// contenido inventado, son correcciones de una palabra mal escrita.
const CORRECCIONES_MODULOS: Record<string, string> = {
  "MEDICINA DE UREGENCIAS": "MEDICINA DE URGENCIAS",
  "OFTAMOLOGÍA": "OFTALMOLOGÍA",
  "PEDITRÍA": "PEDIATRÍA",
  "PSQUIATRÍA": "PSIQUIATRÍA",
};

// El .txt de concursos trae etiquetas cortas; se mapean a los nombres ya
// establecidos en BRIEF.md / Mapa_Sitio_y_Requerimientos_CICOM.md, que
// vienen del análisis del sitio de referencia.
const NOMBRES_CONCURSOS: Record<string, string> = {
  "CONCURSO FOTOGRAFÍA": "Fotografías en Salud",
  "RETO LEON": "Reto del León",
  "CONCURSO TRABAJOS LIBRES": "Trabajos Libres de Cartel",
};

function corregirEspaciado(texto: string): string {
  return texto.replace(/^"|"$/g, "").replace(/([,:])(\S)/g, "$1 $2");
}

// Quita acentos (NFD + descarta marcas diacríticas), sube a mayúsculas y
// colapsa espacios -- para comparar dos textos que deberían referirse a lo
// mismo pero difieren en acentuación (ver comité organizador más abajo).
const RANGO_DIACRITICOS = new RegExp("[\\u0300-\\u036f]", "g");

function normalizarTexto(s: string): string {
  return s
    .normalize("NFD")
    .replace(RANGO_DIACRITICOS, "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ");
}

// ---------- Storage ----------

async function subirImagen(
  supabase: SupabaseClient,
  localPath: string,
  storagePath: string
): Promise<string> {
  const buffer = await sharp(localPath)
    .rotate() // auto-orienta según EXIF (varias fotos venían rotadas) y limpia el tag
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

// ---------- upserts ----------

function limpiar(campos: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(campos).filter(([, v]) => v !== undefined));
}

async function upsertPorNombre(
  supabase: SupabaseClient,
  tabla: string,
  nombre: string,
  campos: Record<string, unknown>
): Promise<{ id: number; creado: boolean }> {
  const camposLimpios = limpiar(campos);

  const { data: existente, error: errorSelect } = await supabase
    .from(tabla)
    .select("id")
    .eq("nombre", nombre)
    .maybeSingle();
  if (errorSelect) throw errorSelect;

  if (existente) {
    if (Object.keys(camposLimpios).length > 0) {
      const { error } = await supabase.from(tabla).update(camposLimpios).eq("id", existente.id);
      if (error) throw error;
    }
    return { id: existente.id as number, creado: false };
  }

  const { data: creado, error } = await supabase
    .from(tabla)
    .insert({ nombre, ...camposLimpios })
    .select("id")
    .single();
  if (error) throw error;
  return { id: creado.id as number, creado: true };
}

async function upsertEdicionActual(
  supabase: SupabaseClient,
  campos: Record<string, unknown>
): Promise<void> {
  const camposLimpios = limpiar(campos);
  const { data: existente, error: errorSelect } = await supabase
    .from("ediciones")
    .select("id")
    .eq("es_actual", true)
    .maybeSingle();
  if (errorSelect) throw errorSelect;

  if (existente) {
    if (Object.keys(camposLimpios).length > 0) {
      const { error } = await supabase.from("ediciones").update(camposLimpios).eq("id", existente.id);
      if (error) throw error;
    }
    return;
  }

  const { error } = await supabase.from("ediciones").insert({ es_actual: true, ...camposLimpios });
  if (error) throw error;
}

// ---------- reporte ----------

const reporte = {
  modulosSinFoto: [] as string[],
  comiteSinFoto: [] as string[],
};

// ---------- main ----------

async function main() {
  const supabase = crearCliente();

  // Eslogan / homenajeado -> edición actual
  const eslogan = corregirEspaciado(
    readFileSync(path.join(IMAGENES_DIR, "Eslogan para pagina principal.txt"), "utf8").trim()
  );

  const fotoHomeHomenajeado = path.join(
    IMAGENES_DIR,
    "Fotos doctores/Doctor Homeneajado/Principal Profesora Homenajeado.JPG"
  );
  const fotoSubpaginaHomenajeado = path.join(
    IMAGENES_DIR,
    "Fotos doctores/Doctor Homeneajado/Subpagina de Profesora Homenajeado.JPG"
  );

  await upsertEdicionActual(supabase, {
    // Tomado directo del logo oficial (Imagenes/Logo de leones/2.jpg y 3.jpg,
    // "XXXIV CICOM"), no inventado: es el único lugar donde apareció el
    // número de edición hasta ahora.
    numero: 34,
    nombre: "XXXIV CICOM",
    lema: eslogan,
    fecha_inicio: "2026-11-23",
    fecha_fin: "2026-11-27",
    homenajeado_nombre: "DR. HÉCTOR ENRIQUE MONTES MUÑOZ",
    homenajeado_foto_home_url: existsSync(fotoHomeHomenajeado)
      ? await subirImagen(supabase, fotoHomeHomenajeado, "ediciones/homenajeado-home.jpg")
      : undefined,
    homenajeado_foto_subpagina_url: existsSync(fotoSubpaginaHomenajeado)
      ? await subirImagen(supabase, fotoSubpaginaHomenajeado, "ediciones/homenajeado-subpagina.jpg")
      : undefined,
    bienvenida_autor_nombre: "DR. DIEGO ARMANDO CASTELLANOS HORTA",
  });
  console.log("✓ Edición actual (número, nombre, lema y fotos de homenajeado)");

  // Módulos
  const modulosTxt = readFileSync(
    path.join(IMAGENES_DIR, "Logos Modulos/Nombre modulos.txt"),
    "utf8"
  );
  const modulosDir = path.join(IMAGENES_DIR, "Logos Modulos");
  let modulosSembrados = 0;
  for (const { numero, texto } of parseListaSimple(modulosTxt)) {
    const nombre = CORRECCIONES_MODULOS[texto] ?? texto;
    const iconoPath = path.join(modulosDir, `${numero}.jpg`);
    let iconoUrl: string | undefined;
    if (existsSync(iconoPath)) {
      iconoUrl = await subirImagen(supabase, iconoPath, `modulos/${numero}.jpg`);
    } else {
      reporte.modulosSinFoto.push(nombre);
    }
    await upsertPorNombre(supabase, "modulos", nombre, {
      especialidad: nombre,
      icono_url: iconoUrl,
      orden: numero,
    });
    modulosSembrados++;
  }
  console.log(`✓ ${modulosSembrados} módulos sembrados`);

  // Concursos
  const concursosTxt = readFileSync(
    path.join(IMAGENES_DIR, "Logos Concursos/Nombre concursos.txt"),
    "utf8"
  );
  const concursosDir = path.join(IMAGENES_DIR, "Logos Concursos");
  let concursosSembrados = 0;
  for (const { numero, texto } of parseListaSimple(concursosTxt)) {
    const nombre = NOMBRES_CONCURSOS[texto] ?? texto;
    const iconoPath = path.join(concursosDir, `${numero}.jpg`);
    const iconoUrl = existsSync(iconoPath)
      ? await subirImagen(supabase, iconoPath, `concursos/${numero}.jpg`)
      : undefined;
    await upsertPorNombre(supabase, "concursos", nombre, { icono_url: iconoUrl });
    concursosSembrados++;
  }
  console.log(`✓ ${concursosSembrados} concursos sembrados`);

  // Comité organizador
  const comiteTxt = readFileSync(
    path.join(IMAGENES_DIR, "Fotos doctores/Comite organizador/Lista de comité prganizador.txt"),
    "utf8"
  );
  const comiteDir = path.join(IMAGENES_DIR, "Fotos doctores/Comite organizador");
  const archivosComite = readdirSync(comiteDir).filter((f) => /\.(jpe?g|png)$/i.test(f));
  // A diferencia de módulos/concursos, estos archivos se nombran por CARGO
  // ("COORDINADOR GENERAL.jpg"), no por número -- coincide por texto
  // normalizado (sin acentos, mayúsculas, espacios colapsados) contra el
  // cargo del .txt, porque la acentuación entre archivo y .txt no siempre
  // coincide (ej. archivo "...TESORERIA.jpg" sin acento vs. .txt
  // "...TESORERÍA" con acento).
  const fotoPorCargo = new Map<string, string>();
  for (const archivo of archivosComite) {
    const base = archivo.replace(/\.(jpe?g|png)$/i, "");
    fotoPorCargo.set(normalizarTexto(base), path.join(comiteDir, archivo));
  }

  let comiteSembrado = 0;
  for (const { numero, cargo, nombre } of parseComite(comiteTxt)) {
    const fotoPath = fotoPorCargo.get(normalizarTexto(cargo));
    let fotoUrl: string | undefined;
    if (fotoPath) {
      fotoUrl = await subirImagen(supabase, fotoPath, `comite/${numero}.jpg`);
    } else {
      reporte.comiteSinFoto.push(`${nombre} (${cargo})`);
    }
    await upsertPorNombre(supabase, "comite_organizador", nombre, { cargo, foto_url: fotoUrl });
    comiteSembrado++;
  }
  console.log(`✓ ${comiteSembrado} miembros del comité sembrados`);

  console.log("\n--- Reporte de contenido faltante ---");
  console.log(`Módulos sin ícono (${reporte.modulosSinFoto.length}):`, reporte.modulosSinFoto);
  console.log(`Comité sin foto (${reporte.comiteSinFoto.length}):`, reporte.comiteSinFoto);
  console.log("Mensaje de bienvenida: falta el texto del mensaje -- home muestra el autor.");
  console.log("Sedes, patrocinadores, cursos y talleres: sin contenido todavía.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
