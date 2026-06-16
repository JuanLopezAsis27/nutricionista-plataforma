import { redirect } from "next/navigation";
import { auth } from "@/lib/autenticacion/auth";
import { BarraLateral } from "@/componentes/layout/BarraLateral";
import { BarraSuperior } from "@/componentes/layout/BarraSuperior";

/**
 * Layout del panel del nutricionista.
 *
 * Verifica la sesión en el servidor: si no hay sesión redirige a /login, y si
 * el usuario no es NUTRICIONISTA lo manda a su portal de paciente. Renderiza
 * la barra lateral fija y la barra superior.
 */
export default async function LayoutDashboard({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesion = await auth();

  if (!sesion?.user) {
    redirect("/login");
  }
  if (sesion.user.rol !== "NUTRICIONISTA") {
    redirect("/mis-turnos");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <BarraLateral email={sesion.user.email} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <BarraSuperior email={sesion.user.email} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
