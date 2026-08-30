import Link from "next/link";

export default function NotFound() {
  return (
    <div>
      <h1>Página no encontrada</h1>
      <p>La página que buscas no existe o fue movida.</p>
      <Link href="/">Volver al inicio</Link>
    </div>
  );
}
