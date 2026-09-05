import { redirect } from "next/navigation";
import { obtenerSesionAdminActual } from "@/lib/admin/sesion";
import { LotesPanel } from "@/components/admin/LotesPanel";

export default async function AdminLotesPage() {
  // El layout protegido ya garantiza que hay sesión -- se vuelve a leer
  // aquí porque hace falta el rol (admin ve la lista, superadmin además
  // genera y descarga), no por desconfianza del layout en sí.
  const sesion = await obtenerSesionAdminActual();
  if (!sesion) {
    redirect("/admin/login");
  }

  return (
    <div>
      <h1>Lotes de boletos</h1>
      <LotesPanel rol={sesion.rol} />
    </div>
  );
}
