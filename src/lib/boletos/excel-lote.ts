// Sin "server-only": mismo motivo que pdf-boleto-digital.ts -- ni process.env
// ni nada exclusivo de Next, así que se puede probar/generar fuera de la app.
import ExcelJS from "exceljs";
import officeCrypto from "officecrypto-tool";

export type BoletoLoteExcel = { folio: string; password: string };

async function generarExcelPlano(boletos: BoletoLoteExcel[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const hoja = workbook.addWorksheet("Boletos");
  hoja.columns = [
    { header: "Folio", key: "folio", width: 16 },
    { header: "Contraseña", key: "password", width: 16 },
  ];
  for (const boleto of boletos) {
    hoja.addRow({ folio: boleto.folio, password: boleto.password });
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// officeCrypto.encrypt implementa ECMA-376 Agile Encryption -- el cifrado
// real que usa Excel al "Cifrar con contraseña" (contenedor CFB + AES),
// no una bandera de "proteger libro/hoja" que no cifra nada. Sin la
// contraseña del archivo (que nunca se guarda -- se muestra una sola vez al
// terminar la generación del lote), este buffer es inservible incluso para
// quien tenga acceso al bucket.
export async function generarExcelLoteCifrado(
  boletos: BoletoLoteExcel[],
  passwordArchivo: string
): Promise<Buffer> {
  const plano = await generarExcelPlano(boletos);
  const cifrado = officeCrypto.encrypt(plano, { password: passwordArchivo });
  return Buffer.from(cifrado);
}
