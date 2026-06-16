import { redirect } from "next/navigation";

/**
 * El alta de turnos se realiza mediante un modal en el listado.
 * Esta ruta se conserva por compatibilidad y redirige al listado.
 */
export default function PaginaNuevoTurno() {
  redirect("/dashboard/turnos");
}
