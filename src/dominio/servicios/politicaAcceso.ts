import { ErrorAccesoDenegado } from "../errores/ErrorAccesoDenegado";
import type { RolUsuario } from "../entidades/Usuario";

/**
 * Política de acceso a los datos de un paciente.
 *
 * "Un paciente solo accede a sus propios datos" es una regla de negocio, no un
 * detalle de transporte. Estaba escrita a mano en once routers de tRPC —la
 * capa más externa— y, al vivir ahí, no la cubría ningún test: los 133 que
 * había estaban en dominio e infraestructura, y `src/servidor` no tenía
 * ninguno. Una regla de autorización sin tests es justo la que no conviene
 * dejar sin red.
 *
 * Acá es TypeScript puro y verificable, y los routers pasan a leerse como lo
 * que deberían ser: traducción de transporte.
 */

/** Lo mínimo que hace falta saber del usuario para decidir el acceso. */
export interface IdentidadAcceso {
  rol: RolUsuario;
  /** Paciente asociado a la sesión; null si el usuario no es un paciente. */
  pacienteId: string | null;
}

/**
 * El paciente de la sesión.
 *
 * Para los procedimientos del portal del paciente ("mi plan", "mis turnos"),
 * donde el sujeto es siempre quien está autenticado y no hay nada que elegir.
 *
 * @throws ErrorAccesoDenegado si el usuario no tiene un paciente asociado.
 */
export function pacienteDeSesion(usuario: IdentidadAcceso): string {
  if (!usuario.pacienteId) {
    throw new ErrorAccesoDenegado("Tu usuario no tiene un paciente asociado.");
  }
  return usuario.pacienteId;
}

/**
 * El paciente que este usuario puede consultar.
 *
 * Para los procedimientos que sirven a los dos roles: el nutricionista elige
 * a qué paciente mira (`solicitado`); cualquier otro usuario queda acotado al
 * suyo, y pedir uno ajeno es acceso denegado.
 *
 * @param solicitado paciente pedido explícitamente, si lo hubo.
 * @param recurso    nombre en plural para el mensaje de error ("turnos").
 * @throws ErrorAccesoDenegado si no hay paciente que resolver, o si se pidió
 *         uno ajeno.
 */
export function pacienteConsultable(
  usuario: IdentidadAcceso,
  solicitado: string | null | undefined,
  recurso = "datos",
): string {
  const objetivo =
    usuario.rol === "NUTRICIONISTA" ? solicitado : usuario.pacienteId;

  if (!objetivo) {
    throw new ErrorAccesoDenegado("No se indicó un paciente válido.");
  }
  if (
    usuario.rol !== "NUTRICIONISTA" &&
    solicitado &&
    solicitado !== objetivo
  ) {
    throw new ErrorAccesoDenegado(`Solo podés ver tus propios ${recurso}.`);
  }
  return objetivo;
}
