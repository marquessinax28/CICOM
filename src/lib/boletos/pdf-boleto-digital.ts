// Sin secretos ni process.env -- a propósito sin el guard "server-only"
// (ver el comentario al inicio de plantilla-config.ts): esta función se
// importa tanto desde el webhook (Next) como desde
// scripts/generar-boleto-muestra.ts (tsx, fuera de Next), donde ese guard
// siempre lanza.
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";
import {
  CAMPOS_BOLETO_DIGITAL,
  PLANTILLA_ALTO_PX,
  PLANTILLA_ANCHO_PX,
  type CampoBoleto,
} from "./plantilla-config";

export type DatosBoletoDigital = {
  folio: string;
  password: string;
  nombre: string;
  correo: string;
  /** Monto realmente pagado (ordenes_compra.monto_centavos), no un precio de catálogo. */
  costoCentavos: number;
};

// Versión para una página de lote: costo/nombre/correo no aplican todavía
// (el boleto nace sin comprador; se activa después) -- omitirlos deja esas
// zonas de la plantilla en blanco, en vez de dibujar un texto vacío.
export type DatosBoletoPagina = {
  folio: string;
  password: string;
  nombre?: string;
  correo?: string;
  costoCentavos?: number;
};

// Navy oscuro del diseño (aprox. el mismo tono que el texto impreso de las
// etiquetas), para texto sobre fondo blanco. Blanco puro para el único
// campo sobre fondo navy (costo, en el talón). Ver ColorTexto en
// plantilla-config.ts.
const COLOR_OSCURO = rgb(0.098, 0.106, 0.235);
const COLOR_CLARO = rgb(1, 1, 1);

function formatearCosto(centavos: number): string {
  return (centavos / 100).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
}

// Reduce el tamaño de fuente de 1 en 1 hasta que el texto quepa en
// anchoMax, sin bajar de fontSizeMin -- nunca corta el texto, en el peor
// caso (nombre o correo excepcionalmente largos) queda ligeramente
// apretado a fontSizeMin en vez de desbordarse fuera del renglón.
function ajustarFontSize(
  font: PDFFont,
  texto: string,
  anchoMax: number,
  fontSizeInicial: number,
  fontSizeMin: number
): number {
  let size = fontSizeInicial;
  while (size > fontSizeMin && font.widthOfTextAtSize(texto, size) > anchoMax) {
    size -= 1;
  }
  return size;
}

// Margen interno para que el texto centrado no toque el borde de la caja.
const MARGEN_INTERNO_CAJA_PX = 16;
// Separación entre el renglón impreso y la base del texto que se dibuja
// encima -- que se apoye visualmente sobre la línea, no que la atraviese.
const SEPARACION_SOBRE_LINEA_PX = 6;
// Separación entre el final de la etiqueta impresa ("NOMBRE:", "CORREO:")
// y el inicio del texto -- sin esto, el texto queda pegado al ":" (medido
// en la primera muestra generada: "CORREO:maria...", sin aire).
const PADDING_IZQUIERDO_LINEA_PX = 10;
// Ajuste empírico para centrar verticalmente texto en mayúsculas (folio,
// contraseña, costo) dentro de su caja: pdf-lib posiciona el baseline, no
// el centro visual del glifo.
const FACTOR_CENTRADO_VERTICAL = 0.32;

function dibujarCampo(
  page: PDFPage,
  campo: CampoBoleto,
  texto: string,
  fontRegular: PDFFont,
  fontBold: PDFFont
) {
  const font = campo.negrita ? fontBold : fontRegular;
  const color = campo.color === "claro" ? COLOR_CLARO : COLOR_OSCURO;

  if (campo.tipo === "centrado") {
    const anchoDisponible = campo.ancho - MARGEN_INTERNO_CAJA_PX * 2;
    const size = ajustarFontSize(font, texto, anchoDisponible, campo.fontSize, campo.fontSizeMin);
    const anchoTexto = font.widthOfTextAtSize(texto, size);
    const xCentroImagen = campo.x + campo.ancho / 2;
    const yCentroImagen = campo.y + campo.alto / 2;
    page.drawText(texto, {
      x: xCentroImagen - anchoTexto / 2,
      y: PLANTILLA_ALTO_PX - yCentroImagen - size * FACTOR_CENTRADO_VERTICAL,
      size,
      font,
      color,
    });
    return;
  }

  const anchoDisponible = campo.anchoDisponible - PADDING_IZQUIERDO_LINEA_PX;
  const size = ajustarFontSize(font, texto, anchoDisponible, campo.fontSize, campo.fontSizeMin);
  page.drawText(texto, {
    x: campo.x + PADDING_IZQUIERDO_LINEA_PX,
    y: PLANTILLA_ALTO_PX - campo.yLinea + SEPARACION_SOBRE_LINEA_PX,
    size,
    font,
    color,
  });
}

// Agrega UNA página al documento ya abierto, reutilizando la imagen y las
// fuentes ya incrustadas (embedPng/embedFont son costosas -- un lote de
// cientos de páginas las incrusta una sola vez, no una por boleto).
// costo/nombre/correo se omiten si no vienen (boletos de lote: nacen sin
// comprador, esas zonas quedan en blanco en vez de dibujar texto vacío).
function agregarPaginaBoleto(
  pdf: PDFDocument,
  imagen: PDFImage,
  fontRegular: PDFFont,
  fontBold: PDFFont,
  datos: DatosBoletoPagina
): void {
  const page = pdf.addPage([PLANTILLA_ANCHO_PX, PLANTILLA_ALTO_PX]);
  page.drawImage(imagen, { x: 0, y: 0, width: PLANTILLA_ANCHO_PX, height: PLANTILLA_ALTO_PX });

  if (datos.costoCentavos !== undefined) {
    const costoTexto = formatearCosto(datos.costoCentavos);
    dibujarCampo(page, CAMPOS_BOLETO_DIGITAL.costo, costoTexto, fontRegular, fontBold);
  }

  dibujarCampo(page, CAMPOS_BOLETO_DIGITAL.folioTalon, datos.folio, fontRegular, fontBold);
  dibujarCampo(page, CAMPOS_BOLETO_DIGITAL.contrasenaTalon, datos.password, fontRegular, fontBold);

  dibujarCampo(page, CAMPOS_BOLETO_DIGITAL.folioCentral, datos.folio, fontRegular, fontBold);
  dibujarCampo(page, CAMPOS_BOLETO_DIGITAL.contrasenaCentral, datos.password, fontRegular, fontBold);

  dibujarCampo(page, CAMPOS_BOLETO_DIGITAL.folioDerecha, datos.folio, fontRegular, fontBold);
  dibujarCampo(page, CAMPOS_BOLETO_DIGITAL.contrasenaDerecha, datos.password, fontRegular, fontBold);

  if (datos.nombre !== undefined) {
    dibujarCampo(page, CAMPOS_BOLETO_DIGITAL.nombre, datos.nombre, fontRegular, fontBold);
  }
  if (datos.correo !== undefined) {
    dibujarCampo(page, CAMPOS_BOLETO_DIGITAL.correo, datos.correo, fontRegular, fontBold);
  }
}

// plantillaPng: bytes del PNG de la plantilla, ya leídos del bucket
// privado por el llamador (esta función no conoce Supabase Storage --
// mantiene la generación de PDF independiente de dónde vive el archivo,
// para poder probarla / generar una muestra sin tocar la base de datos).
export async function generarPdfBoletoDigital(
  datos: DatosBoletoDigital,
  plantillaPng: Uint8Array
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const imagen = await pdf.embedPng(plantillaPng);
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  agregarPaginaBoleto(pdf, imagen, fontRegular, fontBold, datos);

  return pdf.save();
}

// Un PDF, una página por boleto del lote -- misma plantilla, folio y
// contraseña en claro (para imprimir), costo/nombre/correo en blanco.
export async function generarPdfLoteBoletos(
  datosLista: DatosBoletoPagina[],
  plantillaPng: Uint8Array
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const imagen = await pdf.embedPng(plantillaPng);
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  for (const datos of datosLista) {
    agregarPaginaBoleto(pdf, imagen, fontRegular, fontBold, datos);
  }

  return pdf.save();
}
