/** Entidad con la propiedad y el método que sostienen la exclusividad del día. */
interface ConDiaAsignado {
  id: string;
  diasAntes: number | null;
  liberarDia(): unknown;
}

/** Repositorio con lo mínimo que la función necesita para reescribir. */
interface RepoConActualizar<T> {
  actualizar(entidad: T): Promise<T>;
}

/**
 * Libera un escalón de "días antes" de cualquier otra entidad que lo tuviera
 * asignado, para que el que se está guardando quede como el único texto de
 * ESE día.
 *
 * Mismo motivo que `desmarcarOtrasPredeterminadas`: sin esta regla, asignar
 * "3 días antes" a una plantilla nueva podría dejar dos plantillas con el
 * mismo día y el barrido eligiendo cualquiera de las dos por orden de fila.
 */
export async function liberarDiaDeOtras<T extends ConDiaAsignado>(
  repositorio: RepoConActualizar<T>,
  entidades: T[],
  diasAntes: number,
  idNueva: string | null,
): Promise<void> {
  for (const otra of entidades) {
    if (otra.diasAntes === diasAntes && otra.id !== idNueva) {
      await repositorio.actualizar(otra.liberarDia() as T);
    }
  }
}
