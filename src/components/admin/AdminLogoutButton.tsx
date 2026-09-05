"use client";

import { useRouter } from "next/navigation";

export function AdminLogoutButton() {
  const router = useRouter();

  async function onClick() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-dorado hover:text-dorado"
    >
      Cerrar sesión
    </button>
  );
}
