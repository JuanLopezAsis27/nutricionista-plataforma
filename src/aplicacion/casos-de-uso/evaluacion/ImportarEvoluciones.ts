import type { IEvolucionRepositorio } from "@/dominio/repositorios/IEvolucionRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import {
  Evolucion,
  type DatosNuevaEvolucion,
} from "@/dominio/entidades/Evolucion";
import { ErrorDominio } from "@/dominio/errores/ErrorDominio";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

/** Qué pasó con cada evolución del lote. */
export type EstadoImportacionEvolucion =
  "REGISTRADA" | "DUPLICADA" | "RECHAZADA";

export interface ResultadoEvolucionImportada {
  fecha: Date;
  estado: EstadoImportacionEvolucion;
  /** Por qué no entró. Null cuando se registró. */
  motivo: string | null;
}

export interface ResultadoImportacionEvoluciones {
  registradas: number;
  resultados: ResultadoEvolucionImportada[];
}

/**
 * Caso de uso: importar de una sola vez las evoluciones que se leyeron de un
 * documento de historia clínica.
 *
 * **No es todo-o-nada, y es deliberado**, por lo mismo que la importación de
 * mediciones: un cuaderno de seguimiento trae años de consultas, y que un
 * bloque choque contra una evolución ya cargada no puede tirar abajo las otras
 * quince. Cada una se resuelve por su cuenta y el resultado dice qué entró.
 *
 * La regla de una evolución por paciente y fecha se sostiene igual: la fecha
 * repetida se informa como DUPLICADA y **no se pisa lo que ya estaba**. Es lo
 * que hace que volver a leer el mismo documento —algo que pasa: se sube de
 * nuevo para corregir un campo— no duplique el seguimiento entero.
 */
export class ImportarEvoluciones {
  constructor(
    private readonly evoluciones: IEvolucionRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(datos: {
    pacienteId: string;
    evoluciones: readonly Omit<DatosNuevaEvolucion, "pacienteId">[];
  }): Promise<ResultadoImportacionEvoluciones> {
    const paciente = await this.pacientes.obtenerPorId(datos.pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(datos.pacienteId);
    }
    if (datos.evoluciones.length === 0) {
      throw new ErrorValidacion("No hay evoluciones para importar.");
    }

    const resultados: ResultadoEvolucionImportada[] = [];
    let registradas = 0;

    // En serie y por fecha ascendente: el chequeo de duplicado consulta lo ya
    // escrito, así que dos bloques con la misma fecha tienen que verse uno al
    // otro. En paralelo los dos pasarían el chequeo y chocarían recién contra
    // el índice único de la base.
    const ordenadas = [...datos.evoluciones].sort(
      (a, b) => a.fecha.getTime() - b.fecha.getTime(),
    );

    for (const campos of ordenadas) {
      try {
        const evolucion = Evolucion.crear(
          { ...campos, pacienteId: datos.pacienteId },
          crypto.randomUUID(),
        );
        if (
          await this.evoluciones.existeEnFecha(
            datos.pacienteId,
            evolucion.fecha,
          )
        ) {
          resultados.push({
            fecha: evolucion.fecha,
            estado: "DUPLICADA",
            motivo: "El paciente ya tiene una evolución en esa fecha.",
          });
          continue;
        }
        await this.evoluciones.crear(evolucion);
        registradas += 1;
        resultados.push({
          fecha: evolucion.fecha,
          estado: "REGISTRADA",
          motivo: null,
        });
      } catch (error) {
        // Solo se absorbe lo que es culpa del DATO (una evolución vacía, una
        // fecha futura). Un fallo de infraestructura tiene que llegar al
        // middleware de errores como en cualquier otra escritura.
        if (!(error instanceof ErrorDominio)) throw error;
        resultados.push({
          fecha: campos.fecha,
          estado: "RECHAZADA",
          motivo: error.message,
        });
      }
    }

    return { registradas, resultados };
  }
}
