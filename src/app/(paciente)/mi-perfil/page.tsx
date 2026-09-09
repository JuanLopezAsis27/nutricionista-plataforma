import { MiPerfil } from "@/componentes/perfil/MiPerfil";

/**
 * Mi perfil del PACIENTE.
 *
 * Misma pantalla que la del panel del profesional (`/dashboard/mi-perfil`);
 * ver `componentes/perfil/MiPerfil`. La ruta arranca con `mi-` a propósito: es
 * el prefijo que `proxy.ts` protege en el portal.
 */
export default function PaginaMiPerfil() {
  return <MiPerfil />;
}
