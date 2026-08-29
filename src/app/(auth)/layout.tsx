/**
 * Layout del grupo de autenticación (login).
 * Centra el contenido en pantalla. Sin sidebar ni navbar.
 */
export default function LayoutAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="patron-puntos flex min-h-screen items-center justify-center bg-muted p-4">
      {children}
    </main>
  );
}
