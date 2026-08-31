type Props = {
  tipo: "error" | "exito";
  mensaje: string;
  incidentId?: string;
};

// Patrón único de aviso para formularios en todo el sitio (contacto hoy,
// verificación de correo / checkout / activación de boleto después). Un
// solo componente para que el flujo de pago se vea y se comporte igual a
// como ya lo probamos aquí.
export function FormAlert({ tipo, mensaje, incidentId }: Props) {
  const esError = tipo === "error";

  return (
    <div
      role={esError ? "alert" : "status"}
      aria-live={esError ? "assertive" : "polite"}
      className={
        esError
          ? "rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
          : "rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300"
      }
    >
      <p>{mensaje}</p>
      {incidentId && (
        <p className="mt-1 text-xs opacity-75">
          Si el problema sigue, comparte este código con nosotros: {incidentId}
        </p>
      )}
    </div>
  );
}
