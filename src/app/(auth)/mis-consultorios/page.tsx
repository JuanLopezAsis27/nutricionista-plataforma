import { redirect } from "next/navigation";
import { auth } from "@/lib/autenticacion/auth";
import { EleccionConsultorio } from "@/componentes/consultorios/EleccionConsultorio";

/**
 * «Elegí tu consultorio» (migración 78, ver docs/CUENTAS-PACIENTE.md).
 *
 * Vive en el grupo `(auth)` y no en `(paciente)` a propósito: el layout del
 * portal manda ACÁ a quien no tiene consultorio activo, así que esta página no
 * puede estar debajo de ese layout. El prefijo `/mis-` es el que la pone bajo
 * la protección del middleware (sin sesión, al login).
 *
 * También se llega desde el selector de la barra lateral («Ver todos»), con un
 * consultorio ya activo: no se redirige, se elige otro.
 */
export default async function PaginaMisConsultorios() {
  const sesion = await auth();
  if (!sesion?.user) redirect("/login");
  if (sesion.user.rol === "NUTRICIONISTA") redirect("/dashboard");
  if (sesion.user.rol === "SUPERADMIN") redirect("/admin");

  return <EleccionConsultorio />;
}
