import type { ConsultorioDeCuenta } from "../repositorios/ICuentaPacienteRepositorio";

/**
 * Reglas de la cuenta de un paciente que puede tener varios consultorios.
 *
 * Una cuenta la comparten todos los consultorios donde la persona es
 * paciente: el mismo email y la misma contraseña abren las dos fichas. De eso
 * sale la regla que importa: **un consultorio solo administra la cuenta si es
 * EXCLUSIVAMENTE suya**. Si el consultorio B pudiera fijar la contraseña de una
 * cuenta que también usa el A, podría entrar como el paciente y leer los datos
 * clínicos de A. Lo mismo con el email de inicio de sesión: cambiarlo desde B
 * le cambia el login a la persona en todos lados.
 */

/**
 * ¿La cuenta es solo del consultorio que pregunta?
 *
 * Recibe cuántas fichas tiene la cuenta en toda la plataforma (una por
 * consultorio). Quien pregunta llegó a la cuenta por SU ficha, así que una de
 * esas es la suya: con una sola, no hay nadie más.
 */
export function esCuentaExclusiva(cantidadDeFichas: number): boolean {
  return cantidadDeFichas <= 1;
}

/**
 * En qué consultorio arranca la sesión.
 *
 * Con uno solo no hay nada que elegir. Con varios, el que eligió la persona la
 * última vez en ese dispositivo, SI todavía tiene ficha ahí (una ficha pudo
 * haberse borrado). Si no, `null`: le toca elegir.
 */
export function consultorioInicial(
  consultorios: ConsultorioDeCuenta[],
  pacientePreferidoId: string | null,
): ConsultorioDeCuenta | null {
  if (consultorios.length === 1) return consultorios[0]!;
  if (!pacientePreferidoId) return null;
  return consultorios.find((c) => c.pacienteId === pacientePreferidoId) ?? null;
}
