import Link from "next/link";

export default function AdminPage() {
  return (
    <div>
      <h1>Panel de administración</h1>
      <p>
        <Link href="/admin/lotes">Lotes de boletos</Link>
      </p>
      <p>Panel de contenido pendiente de Fase 7.</p>
    </div>
  );
}
