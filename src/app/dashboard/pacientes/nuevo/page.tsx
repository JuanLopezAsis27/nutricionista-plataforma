import { redirect } from "next/navigation";

/**
 * El alta de pacientes se realiza mediante un modal en el listado.
 * Esta ruta se conserva por compatibilidad y redirige al listado.
 */
export default function PaginaNuevoPaciente() {
  redirect("/dashboard/pacientes");
}
