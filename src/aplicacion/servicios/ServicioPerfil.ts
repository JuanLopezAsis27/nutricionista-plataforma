import type { ObtenerMiPerfil } from "@/aplicacion/casos-de-uso/perfil/ObtenerMiPerfil";
import type { CambiarFotoPerfil } from "@/aplicacion/casos-de-uso/perfil/CambiarFotoPerfil";
import type { CambiarPassword } from "@/aplicacion/casos-de-uso/perfil/CambiarPassword";
import type { CambiarPasswordDto, PerfilSalidaDto } from "../dtos/perfil.dto";

/**
 * Servicio de aplicación de "Mi perfil": la cuenta propia.
 *
 * Sirve a los DOS roles con los mismos casos de uso. La pantalla del paciente y
 * la del nutricionista se ven distintas por el layout que las envuelve, pero lo
 * que hacen es idéntico —elegir una foto y cambiar la contraseña— y duplicar
 * eso en dos servicios habría duplicado también la política de contraseñas.
 *
 * El `usuarioId` siempre lo pone el router desde la sesión, nunca el cliente:
 * no hay ningún procedimiento acá que reciba de quién es el perfil.
 */
export class ServicioPerfil {
  constructor(
    private readonly obtenerUC: ObtenerMiPerfil,
    private readonly cambiarFotoUC: CambiarFotoPerfil,
    private readonly cambiarPasswordUC: CambiarPassword,
  ) {}

  async obtener(usuarioId: string): Promise<PerfilSalidaDto> {
    return this.obtenerUC.ejecutar(usuarioId);
  }

  /** `archivoId` en null quita la foto (y borra la anterior del bucket). */
  async cambiarFoto(
    usuarioId: string,
    archivoId: string | null,
  ): Promise<PerfilSalidaDto> {
    await this.cambiarFotoUC.ejecutar({ usuarioId, archivoId });
    return this.obtenerUC.ejecutar(usuarioId);
  }

  async cambiarPassword(
    usuarioId: string,
    datos: CambiarPasswordDto,
  ): Promise<{ cambiada: true }> {
    await this.cambiarPasswordUC.ejecutar({
      usuarioId,
      passwordActual: datos.passwordActual,
      passwordNueva: datos.passwordNueva,
    });
    return { cambiada: true };
  }
}
