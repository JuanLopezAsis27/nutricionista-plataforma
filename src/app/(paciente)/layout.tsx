import { redirect } from "next/navigation";
import { auth } from "@/lib/autenticacion/auth";
import { BarraLateralPaciente } from "@/componentes/layout/BarraLateralPaciente";

/**
 * Layout del portal del paciente.
 *
 * Verifica la sesión en el servidor: sin sesión redirige a /login; si el
 * usuario es NUTRICIONISTA lo manda al panel. Sidebar colapsable (como el
 * panel del nutricionista) y contenido ancho.
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
    <div className="min-h-screen bg-muted/30 md:flex md:h-screen md:overflow-hidden">
      <BarraLateralPaciente email={sesion.user.email} />
      <main className="min-w-0 flex-1 md:overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
