import { redirect } from "next/navigation";
import { auth } from "@/lib/autenticacion/auth";
import { FormularioLogin } from "@/componentes/auth/FormularioLogin";

/**
 * Página de inicio de sesión.
 * Si ya hay sesión, redirige según el rol; si no, muestra el formulario.
 */
export default async function PaginaLogin() {
  const sesion = await auth();
  if (sesion?.user) {
    redirect(
      sesion.user.rol === "NUTRICIONISTA" ? "/dashboard" : "/mis-turnos",
    );
  }

  return <FormularioLogin />;
}
