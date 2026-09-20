import { redirect } from "next/navigation";
import { auth } from "@/lib/autenticacion/auth";
import { BarraLateral } from "@/componentes/layout/BarraLateral";
import { BarraSuperior } from "@/componentes/layout/BarraSuperior";
import { TiempoReal } from "@/componentes/tiempo-real/TiempoReal";
import { ProveedorSedeActiva } from "@/lib/hooks/useSedeActiva";
import { ProveedorGrabacionConsulta } from "@/componentes/turnos/ProveedorGrabacionConsulta";

/**
 * Layout del panel del nutricionista.
 *
 * Verifica la sesión en el servidor: si no hay sesión redirige a /login, y si
 * el usuario no es NUTRICIONISTA lo manda a su portal de paciente. Renderiza
 * la barra lateral fija y la barra superior.
 *
 * El establecimiento que se está gestionando se comparte desde acá y no desde
 * la pantalla de turnos: el selector vive en la agenda, pero el alta de un
 * turno también se abre desde la ficha del paciente y tiene que arrancar en la
 * misma sede.
 *
 * La grabación de la consulta se comparte desde acá por una razón más fuerte:
 * este layout es lo único que NO se vuelve a montar al navegar entre pantallas
 * del panel, y de eso depende que el micrófono siga abierto mientras el
 * profesional usa la app durante la consulta (ver `docs/GRABACIONES.md`).
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
  if (sesion.user.rol === "SUPERADMIN") {
    redirect("/admin");
  }
  if (sesion.user.rol !== "NUTRICIONISTA") {
    redirect("/mi-inicio");
  }

  return (
    <ProveedorGrabacionConsulta>
      <div className="min-h-dvh md:flex md:h-dvh md:overflow-hidden">
        <TiempoReal />
        <BarraLateral email={sesion.user.email} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col md:overflow-hidden">
          <BarraSuperior email={sesion.user.email} />
          <main className="min-h-0 flex-1 p-4 md:overflow-y-auto md:p-6">
            <ProveedorSedeActiva>{children}</ProveedorSedeActiva>
          </main>
        </div>
      </div>
    </ProveedorGrabacionConsulta>
  );
}
