import type { Metadata } from "next";

// Aplica a /admin/login y a todo lo que esté bajo (protegido) -- ninguna
// página de este subárbol debe indexarse, entre antes o después del login.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
