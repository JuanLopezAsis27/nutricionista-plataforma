import { MiPerfil } from "@/componentes/perfil/MiPerfil";

/**
 * Mi perfil del NUTRICIONISTA.
 *
 * Solo monta el componente: la pantalla es la misma que la del portal del
 * paciente (`/mi-perfil`), y lo que cambia entre las dos es el layout que las
 * envuelve. Ver `componentes/perfil/MiPerfil`.
 */
export default function PaginaMiPerfil() {
  return <MiPerfil />;
}
