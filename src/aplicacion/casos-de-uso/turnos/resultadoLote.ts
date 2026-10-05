import type { Turno } from "@/dominio/entidades/Turno";
import { ErrorDominio } from "@/dominio/errores/ErrorDominio";

/** Un turno del lote que no se tocó, con el motivo que dio el dominio. */
export interface TurnoOmitido {
  id: string;
  motivo: string;
}

/**
 * Resultado de una operación en lote sobre turnos.
 *
 * El lote NO es todo-o-nada, como la importación de una planilla: elegir diez
 * turnos y marcarlos completados no puede fallar entero porque uno ya estaba
 * cancelado. Se aplica a los que admiten el cambio y los demás vuelven acá,
 * con el mensaje del dominio, para que la pantalla diga cuáles y por qué.
 */
export interface ResultadoLoteTurnos {
  actualizados: Turno[];
  omitidos: TurnoOmitido[];
}

/**
 * Recorre los ids de a uno —no en paralelo: son pocos, y en serie cada uno ve
 * la base como la dejó el anterior— y separa los que salieron de los que el
 * dominio rechazó. Solo se atrapa `ErrorDominio`: cualquier otro error es una
 * falla de verdad (base caída, bug) y tiene que llegar al monitor.
 */
export async function aplicarEnLote(
  ids: ReadonlyArray<string>,
  aplicar: (id: string) => Promise<Turno>,
): Promise<ResultadoLoteTurnos> {
  const resultado: ResultadoLoteTurnos = { actualizados: [], omitidos: [] };
  for (const id of new Set(ids)) {
    try {
      resultado.actualizados.push(await aplicar(id));
    } catch (error) {
      if (!(error instanceof ErrorDominio)) throw error;
      resultado.omitidos.push({ id, motivo: error.message });
    }
  }
  return resultado;
}
