export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <header>{/* nav admin, pendiente de Fase 6/7 */}</header>
      <main>{children}</main>
    </>
  );
}
