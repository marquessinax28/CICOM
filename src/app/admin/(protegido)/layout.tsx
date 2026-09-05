import { redirect } from "next/navigation";
import { obtenerSesionAdminActual } from "@/lib/admin/sesion";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";

// Gate autoritativo para toda página bajo /admin salvo /admin/login (que
// vive fuera de este grupo de rutas). proxy.ts ya hace un chequeo rápido
// antes de esto (mejor UX, redirige sin llegar a renderizar nada), pero
// esta es la verificación real -- un cambio futuro al matcher de proxy no
// deja esta ruta descubierta, porque este layout la protege de todas
// formas (CLAUDE.md sección 2: verificar la sesión en el servidor, no solo
// en el middleware).
export default async function AdminProtegidoLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sesion = await obtenerSesionAdminActual();
  if (!sesion) {
    redirect("/admin/login");
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-sm text-slate-300">
        <span>
          {sesion.nombre} — <span className="text-dorado">{sesion.rol}</span>
        </span>
        <AdminLogoutButton />
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
