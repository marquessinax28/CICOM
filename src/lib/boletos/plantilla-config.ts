// Coordenadas y constantes puras -- sin secretos ni acceso a process.env,
// a diferencia del resto de src/lib -- por eso, a propósito, este archivo
// NO lleva el guard "server-only": scripts/generar-boleto-muestra.ts y
// scripts/subir-plantilla-boleto.ts lo importan fuera de Next (vía tsx),
// donde ese guard siempre lanza (solo Next lo neutraliza en el bundle de
// servidor). pdf-boleto-digital.ts, que sí importa este archivo, tiene la
// misma razón para no llevarlo.

// Bucket privado donde vive la plantilla del boleto (PNG) y ruta del
// objeto dentro de ese bucket. Si el comité cambia el diseño, se sube un
// PNG nuevo a esta misma ruta (o se cambia RUTA_PLANTILLA aquí) -- nunca
// hace falta tocar el generador de PDF.
export const BUCKET_PLANTILLAS_BOLETO = "plantillas-boleto";
export const RUTA_PLANTILLA_BOLETO_DIGITAL = "boleto-digital.png";

// Bucket privado donde queda el PDF ya generado de cada boleto digital
// (para reenviarlo/redescargarlo sin tener que reconstruir la contraseña
// en claro, que nunca se guarda -- ver src/lib/boletos/generar-boleto-digital.ts).
// Igual de privado que el de la plantilla: la descarga del comprador
// siempre pasa por una URL firmada de vida corta, nunca por una ruta
// pública ni por este bucket directo.
export const BUCKET_BOLETOS_DIGITALES = "boletos-digitales";

export function rutaPdfBoletoDigital(ordenId: number): string {
  return `orden-${ordenId}.pdf`;
}

// Dimensiones nativas del PNG, en píxeles. El PDF generado usa estas
// mismas dimensiones como tamaño de página en puntos (1px = 1pt): así las
// coordenadas de abajo -- extraídas directamente del PNG -- no necesitan
// ningún factor de escala. El resultado es una página grande en pulgadas
// a 72dpi; quien imprima el boleto ajusta al tamaño real en la imprenta,
// igual que se haría con cualquier archivo de arte final.
export const PLANTILLA_ANCHO_PX = 2000;
export const PLANTILLA_ALTO_PX = 648;

// Coordenadas en el sistema de la IMAGEN (origen arriba-izquierda, Y crece
// hacia abajo) -- igual que cualquier editor de imágenes, para poder
// verificarlas a simple vista contra el PNG. pdf-boleto-digital.ts hace la
// conversión a coordenadas de PDF (origen abajo-izquierda) una sola vez,
// en el momento de dibujar.

// "oscuro" (navy, igual que el texto impreso) para texto sobre fondo
// blanco -- folio, contraseña, nombre, correo. "claro" (blanco) para texto
// sobre fondo navy -- únicamente costo, que va en el talón azul.
export type ColorTexto = "oscuro" | "claro";

/** Campo que se centra dentro de una caja (folio, contraseña, costo). */
export type CampoCentrado = {
  tipo: "centrado";
  x: number;
  y: number;
  ancho: number;
  alto: number;
  fontSize: number;
  fontSizeMin: number;
  negrita: boolean;
  color: ColorTexto;
};

/** Campo que se apoya sobre una línea, alineado a la izquierda (nombre, correo). */
export type CampoLinea = {
  tipo: "linea";
  x: number;
  /** Y de la línea impresa sobre la que se apoya el texto. */
  yLinea: number;
  anchoDisponible: number;
  fontSize: number;
  fontSizeMin: number;
  negrita: boolean;
  color: ColorTexto;
};

export type CampoBoleto = CampoCentrado | CampoLinea;

export type CamposBoletoDigital = {
  costo: CampoCentrado;
  contrasenaTalon: CampoCentrado;
  folioTalon: CampoCentrado;
  contrasenaCentral: CampoCentrado;
  folioCentral: CampoCentrado;
  contrasenaDerecha: CampoCentrado;
  folioDerecha: CampoCentrado;
  nombre: CampoLinea;
  correo: CampoLinea;
};

// Folio y contraseña llevan los MISMOS valores en las tres zonas del
// diseño (talón azul izquierdo, bloque central, bloque derecho) -- así
// cada parte del boleto (la que se corta, la que se queda con el
// asistente, la que se archiva) porta la credencial completa. Las tres
// cajas son idénticas en tamaño (217x54 / 217x55px, medido por
// flood-fill sobre los bordes del PNG); solo cambia el offset X.
const ZONA_TALON_X = 61;
const ZONA_CENTRAL_X = 682;
const ZONA_DERECHA_X = 1765;

const Y_CAJA_CONTRASENA = 363;
const ALTO_CAJA_CONTRASENA = 54;
const Y_CAJA_FOLIO = 478;
const ALTO_CAJA_FOLIO = 55;

function cajaFolioContrasena(x: number, y: number, alto: number): CampoCentrado {
  return {
    tipo: "centrado",
    x,
    y,
    ancho: 217,
    alto,
    fontSize: 26,
    fontSizeMin: 13,
    negrita: true,
    // Estas tres cajas van siempre sobre fondo blanco, en las tres zonas.
    color: "oscuro",
  };
}

export const CAMPOS_BOLETO_DIGITAL: CamposBoletoDigital = {
  // "COSTO:" ya está impreso en el talón (x113-242, y227-249); el monto va
  // debajo, en el espacio en blanco antes del encabezado CONTRASEÑA (y325).
  // A diferencia de todos los demás campos, este va sobre el fondo NAVY
  // del talón -- por eso color:"claro" (blanco), no "oscuro".
  costo: {
    tipo: "centrado",
    x: 30,
    y: 256,
    ancho: 300,
    alto: 60,
    fontSize: 30,
    fontSizeMin: 16,
    negrita: true,
    color: "claro",
  },

  contrasenaTalon: cajaFolioContrasena(ZONA_TALON_X, Y_CAJA_CONTRASENA, ALTO_CAJA_CONTRASENA),
  folioTalon: cajaFolioContrasena(ZONA_TALON_X, Y_CAJA_FOLIO, ALTO_CAJA_FOLIO),

  contrasenaCentral: cajaFolioContrasena(ZONA_CENTRAL_X, Y_CAJA_CONTRASENA, ALTO_CAJA_CONTRASENA),
  folioCentral: cajaFolioContrasena(ZONA_CENTRAL_X, Y_CAJA_FOLIO, ALTO_CAJA_FOLIO),

  contrasenaDerecha: cajaFolioContrasena(ZONA_DERECHA_X, Y_CAJA_CONTRASENA, ALTO_CAJA_CONTRASENA),
  folioDerecha: cajaFolioContrasena(ZONA_DERECHA_X, Y_CAJA_FOLIO, ALTO_CAJA_FOLIO),

  // NOMBRE y CORREO: primer renglón después de la etiqueta impresa, medido
  // por la posición de la línea subrayada en el PNG (detección de fila con
  // alta densidad de píxeles oscuros). Un solo renglón -- si el texto no
  // cabe, pdf-boleto-digital.ts reduce el tamaño de fuente hasta que quepa
  // (nunca lo corta ni lo desborda). El segundo renglón impreso queda en
  // blanco a propósito.
  //
  // TEL, INSTITUCIÓN/CARRERA y MÓDULO A ASISTIR no se dibujan -- no se
  // capturan esos datos, el asistente los llena a mano si quiere.
  nombre: {
    tipo: "linea",
    x: 1122,
    yLinea: 82,
    anchoDisponible: 1753 - 1122,
    fontSize: 26,
    fontSizeMin: 12,
    negrita: false,
    color: "oscuro",
  },
  correo: {
    tipo: "linea",
    x: 1105,
    yLinea: 244,
    anchoDisponible: 1753 - 1105,
    fontSize: 22,
    fontSizeMin: 12,
    negrita: false,
    color: "oscuro",
  },
};
