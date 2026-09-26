import type { InvitacionPortal } from "../entidades/InvitacionPortal";

/** Una invitación encontrada por su código, con el consultorio que la emitió. */
export interface InvitacionEncontrada {
  invitacion: InvitacionPortal;
  nutricionistaId: string;
}

/**
 * Contrato del repositorio de invitaciones al portal (migración 80).
 *
 * Es tabla de inquilino: se emite y se consume dentro del consultorio de la
 * ficha. La excepción es buscar por código, que ocurre ANTES de saber de qué
 * consultorio es —quien la canjea es un paciente, con la sesión de OTRO
 * consultorio o de ninguno—: esa corre con alcance global dentro de la
 * implementación, y lo único que devuelve además de la invitación es el
 * consultorio, para fijar el alcance y seguir desde ahí.
 */
export interface IInvitacionPortalRepositorio {
  /** Guarda la invitación y borra las anteriores de la misma ficha. */
  reemplazarDePaciente(invitacion: InvitacionPortal): Promise<InvitacionPortal>;
  /** Por el hash del código, en toda la plataforma (ver el comentario). */
  obtenerPorCodigoHash(
    codigoHash: string,
  ): Promise<InvitacionEncontrada | null>;
  /** La vigente de una ficha del consultorio en curso, si hay. */
  vigenteDePaciente(
    pacienteId: string,
    ahora: Date,
  ): Promise<InvitacionPortal | null>;
  marcarUsada(id: string, ahora: Date): Promise<void>;
}
