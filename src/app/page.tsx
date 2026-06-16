import { redirect } from "next/navigation";

/**
 * Página de inicio. Redirige al dashboard; el middleware se encargará de
 * mandar a /login si no hay sesión iniciada.
 */
export default function PaginaInicio() {
  redirect("/dashboard");
}
