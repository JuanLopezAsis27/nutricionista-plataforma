import { redirect } from "next/navigation";

/**
 * El alta de dietas se realiza mediante un modal en el listado.
 * Esta ruta se conserva por compatibilidad y redirige al listado.
 */
export default function PaginaNuevaDieta() {
  redirect("/dashboard/dietas");
}
