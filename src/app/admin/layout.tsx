import { redirect } from "next/navigation";
import { auth } from "@/lib/autenticacion/auth";

/**
 * Layout del panel del SUPERADMIN. Verifica la sesión en el servidor: sin
 * sesión → /login; si no es SUPERADMIN → a su propio espacio.
 */
export default async function LayoutAdmin({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesion = await auth();

  if (!sesion?.user) {
    redirect("/login");
  }
  if (sesion.user.rol !== "SUPERADMIN") {
    redirect(sesion.user.rol === "NUTRICIONISTA" ? "/dashboard" : "/mi-inicio");
  }

  return <div className="min-h-screen bg-muted/30">{children}</div>;
}
