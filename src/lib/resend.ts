import "server-only";
import { Resend } from "resend";

let cliente: Resend | null = null;

function getResend(): Resend {
  if (cliente) return cliente;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Falta RESEND_API_KEY en el entorno");
  }

  cliente = new Resend(apiKey);
  return cliente;
}

// Plantilla mínima, sin depender de CSS complejo (la mayoría de los
// clientes de correo lo ignoran o lo eliminan) -- estilos inline directos,
// que aquí no violan ninguna CSP porque este HTML nunca se sirve desde
// nuestro sitio, se renderiza en el cliente de correo del destinatario.
function plantillaCodigoVerificacion(codigo: string): string {
  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #141736; color: #e7e9f5;">
      <p style="font-size: 12px; letter-spacing: 0.1em; color: #94a3b8; text-transform: uppercase; margin: 0 0 4px;">XXXIV CICOM</p>
      <h1 style="font-size: 20px; margin: 0 0 16px; color: #ffffff;">Tu código de verificación</h1>
      <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
        Usa este código para confirmar tu correo y continuar con la compra de tu boleto digital. Expira en 10 minutos.
      </p>
      <p style="font-size: 36px; font-weight: 700; letter-spacing: 0.2em; text-align: center; margin: 0 0 24px; color: #c1a57b;">
        ${codigo}
      </p>
      <p style="font-size: 13px; line-height: 1.6; color: #94a3b8; margin: 0;">
        Si tú no solicitaste este código, puedes ignorar este correo -- nadie puede usarlo sin acceso a tu bandeja de entrada.
      </p>
    </div>
  `.trim();
}

export async function enviarCodigoVerificacion(
  correo: string,
  codigo: string
): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error("Falta RESEND_FROM_EMAIL en el entorno");
  }
  const replyTo = process.env.CONTACTO_SOPORTE_EMAIL;
  if (!replyTo) {
    throw new Error("Falta CONTACTO_SOPORTE_EMAIL en el entorno");
  }

  const resend = getResend();
  const { error } = await resend.emails.send({
    from,
    to: correo,
    replyTo,
    subject: `${codigo} es tu código de verificación — CICOM`,
    html: plantillaCodigoVerificacion(codigo),
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}
