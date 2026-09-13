import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/autenticacion/auth";
import {
  NOMBRE_COOKIE_REFRESCO,
  RUTA_RENOVAR_SESION,
  PARAMETRO_SESION_EXPIRADA,
} from "@/lib/autenticacion/cookieRefresco";
import { FormularioLogin } from "@/componentes/auth/FormularioLogin";

/**
 * Página de inicio de sesión.
 * Si ya hay sesión, redirige según el rol; si no, muestra el formulario.
 *
 * Antes de mostrarlo intenta la sesión persistente. El middleware ya hace esto
 * para las rutas protegidas, pero `/login` no es una de ellas y es a donde
 * llega mucha gente: el que la tiene en favoritos, y el que vuelve de un
 * "Cerrar sesión" ajeno. Sin este paso, esa gente vería el formulario teniendo
 * una sesión persistente válida —justo lo que la función existe para evitar—.
 */
export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ [PARAMETRO_SESION_EXPIRADA]?: string }>;
}) {
  const sesion = await auth();
  if (sesion?.user) {
    redirect(
      sesion.user.rol === "NUTRICIONISTA" ? "/dashboard" : "/mis-turnos",
    );
  }

  // Si la renovación ya falló, no se reintenta: es el corta-bucles entre esta
  // página y el handler, que ante un fallo vuelve acá (ver cookieRefresco.ts).
  const parametros = await searchParams;
  const yaFallo = parametros[PARAMETRO_SESION_EXPIRADA] !== undefined;

  if (!yaFallo && (await cookies()).has(NOMBRE_COOKIE_REFRESCO)) {
    // Acá solo se mira que la cookie exista; validarla es trabajo del handler.
    redirect(RUTA_RENOVAR_SESION);
  }

  return <FormularioLogin />;
}
