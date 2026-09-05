import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight text-white">Panel de administración</h1>
      <p className="mt-2 text-sm text-slate-400">Acceso restringido.</p>
      <div className="mt-8">
        <AdminLoginForm />
      </div>
    </div>
  );
}
