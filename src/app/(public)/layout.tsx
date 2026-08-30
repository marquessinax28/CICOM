export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <header>{/* nav pública, pendiente de Fase 2 */}</header>
      <main>{children}</main>
      <footer>{/* pendiente de Fase 2 */}</footer>
    </>
  );
}
