/**
 * Un consultorio al que una cuenta tiene acceso, tal como lo necesita el
 * portal para dejar elegir en cuál trabajar.
 */
export interface ConsultorioDeCuenta {
  /** La ficha que la cuenta tiene en ese consultorio. */
  pacienteId: string;
  nutricionistaId: string;
  /** Cómo firma el profesional (`nutricionistas.nombre`). */
  nombreProfesional: string;
  /** Foto de perfil del profesional, si eligió una. */
  fotoProfesionalId: string | null;
}

/**
 * Contrato de la cuenta de un paciente vista desde sus fichas (migración 78).
 *
 * La tabla de pacientes es la relación persona ↔ consultorio: cada ficha dice
 * de qué cuenta es (`usuarioId`), y una persona que se atiende con dos
 * nutricionistas tiene UNA cuenta y dos fichas. Las fichas son de inquilino,
 * pero hay dos preguntas que se hacen antes de que exista un inquilino —el
 * login y el selector de consultorio— y otra que cruza a propósito el límite:
 * cuántos consultorios comparten la cuenta. Esas corren con alcance global
 * DENTRO de la implementación, y ninguna devuelve datos de la ficha de otro
 * consultorio.
 */
export interface ICuentaPacienteRepositorio {
  /** Asigna la cuenta a esa ficha del consultorio en curso (su portal). */
  vincular(usuarioId: string, pacienteId: string): Promise<void>;
  /**
   * Cuántas fichas tiene la cuenta —una por consultorio— en TODA la
   * plataforma.
   * Devuelve un número y no la lista: quien pregunta desde un consultorio
   * necesita saber si la cuenta es solo suya, no con quién la comparte.
   */
  contarDeUsuario(usuarioId: string): Promise<number>;
  /** Los consultorios de la cuenta (alcance global: login y portal). */
  listarDeUsuario(usuarioId: string): Promise<ConsultorioDeCuenta[]>;
}
