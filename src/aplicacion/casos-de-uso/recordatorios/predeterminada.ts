/** Entidad con la propiedad y el método que sostienen la exclusividad. */
interface ConPredeterminada {
  id: string;
  predeterminada: boolean;
  desmarcarPredeterminada(): unknown;
}

/** Repositorio con lo mínimo que la función necesita para reescribir. */
interface RepoConActualizar<T> {
  actualizar(entidad: T): Promise<T>;
}

/**
 * Deja una sola entidad predeterminada: la que se está marcando.
 *
 * Genérica porque la regla se repite igual en dos agregados —las plantillas
 * de WhatsApp y las de email— y tenerla dos veces era la forma más directa de
 * que un día quedaran dos predeterminadas y el barrido eligiera cualquiera.
 */
export async function desmarcarOtrasPredeterminadas<
  T extends ConPredeterminada,
>(
  repositorio: RepoConActualizar<T>,
  entidades: T[],
  idNueva: string | null,
): Promise<void> {
  for (const otra of entidades) {
    if (otra.predeterminada && otra.id !== idNueva) {
      await repositorio.actualizar(otra.desmarcarPredeterminada() as T);
    }
  }
}
