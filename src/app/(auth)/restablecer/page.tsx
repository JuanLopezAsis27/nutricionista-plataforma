import { FormularioRestablecer } from "@/componentes/auth/FormularioRestablecer";

/**
 * Página pública para elegir una contraseña nueva. El token de recuperación
 * viaja en la query (`?token=…`), puesto por el enlace del email.
 */
export default async function PaginaRestablecer({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <FormularioRestablecer token={token ?? ""} />;
}
