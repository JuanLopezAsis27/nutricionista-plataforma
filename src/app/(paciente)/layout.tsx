import { redirect } from "next/navigation";
import { auth } from "@/lib/autenticacion/auth";
import { NavPaciente } from "@/componentes/layout/NavPaciente";

/**
 * Layout del portal del paciente.
 *
 * Verifica la sesión en el servidor: sin sesión redirige a /login; si el
 * usuario es NUTRICIONISTA lo manda al panel. Navegación simple superior.
 */
export default async function LayoutPaciente({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesion = await auth();

  if (!sesion?.user) {
    redirect("/login");
  }
  if (sesion.user.rol === "NUTRICIONISTA") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <NavPaciente email={sesion.user.email} />
      <main className="mx-auto max-w-4xl p-4">{children}</main>
    </div>
  );
}
