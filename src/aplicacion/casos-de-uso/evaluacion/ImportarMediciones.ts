import type { IAntropometriaRepositorio } from "@/dominio/repositorios/IAntropometriaRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import {
  Antropometria,
  type DatosNuevaAntropometria,
} from "@/dominio/entidades/Antropometria";
import { ErrorDominio } from "@/dominio/errores/ErrorDominio";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

/** Qué pasó con cada medición del lote. */
export type EstadoImportacion = "REGISTRADA" | "DUPLICADA" | "RECHAZADA";

export interface ResultadoMedicionImportada {
  fecha: Date;
  estado: EstadoImportacion;
  /** Por qué no entró. Null cuando se registró. */
  motivo: string | null;
}

export interface ResultadoImportacion {
  registradas: number;
  resultados: ResultadoMedicionImportada[];
}

/**
 * Caso de uso: importar de una sola vez las mediciones que se leyeron de una
 * planilla de evolución.
 *
 * **No es todo-o-nada, y es deliberado.** Una planilla de seguimiento trae
 * años de consultas: que una columna del 2023 choque contra una medición ya
 * cargada, o que traiga un pliegue fuera de rango, no puede tirar abajo las
 * otras diez que estaban bien. Cada medición se resuelve por su cuenta y el
 * resultado dice qué entró y qué no, para que el profesional corrija solo eso.
 *
 * La regla de una medición por paciente y fecha se sostiene igual —la misma
 * que aplica `RegistrarAntropometria`—: la fecha repetida se informa como
 * DUPLICADA y no se pisa lo que ya estaba. Vale también dentro del propio
 * lote: la segunda columna con la misma fecha encuentra a la primera ya
 * registrada.
 */
export class ImportarMediciones {
  constructor(
    private readonly antropometrias: IAntropometriaRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(datos: {
    pacienteId: string;
    mediciones: readonly Omit<DatosNuevaAntropometria, "pacienteId">[];
  }): Promise<ResultadoImportacion> {
    const paciente = await this.pacientes.obtenerPorId(datos.pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(datos.pacienteId);
    }
    if (datos.mediciones.length === 0) {
      throw new ErrorValidacion("No hay mediciones para importar.");
    }

    const resultados: ResultadoMedicionImportada[] = [];
    let registradas = 0;

    // En serie y por fecha ascendente: el chequeo de duplicado consulta lo ya
    // escrito, así que dos columnas con la misma fecha tienen que verse una a
    // la otra. En paralelo las dos pasarían el chequeo y chocarían recién
    // contra el índice único de la base.
    const ordenadas = [...datos.mediciones].sort(
      (a, b) => a.fecha.getTime() - b.fecha.getTime(),
    );

    for (const medidas of ordenadas) {
      try {
        const medicion = Antropometria.crear(
          { ...medidas, pacienteId: datos.pacienteId },
          crypto.randomUUID(),
        );
        if (
          await this.antropometrias.existeEnFecha(
            datos.pacienteId,
            medicion.fecha,
          )
        ) {
          resultados.push({
            fecha: medicion.fecha,
            estado: "DUPLICADA",
            motivo: "El paciente ya tiene una medición en esa fecha.",
          });
          continue;
        }
        await this.antropometrias.crear(medicion);
        registradas += 1;
        resultados.push({
          fecha: medicion.fecha,
          estado: "REGISTRADA",
          motivo: null,
        });
      } catch (error) {
        // Solo se absorbe lo que es culpa del DATO (un pliegue fuera de rango,
        // una fecha futura). Un fallo de infraestructura tiene que llegar al
        // middleware de errores como en cualquier otra escritura.
        if (!(error instanceof ErrorDominio)) throw error;
        resultados.push({
          fecha: medidas.fecha,
          estado: "RECHAZADA",
          motivo: error.message,
        });
      }
    }

    return { registradas, resultados };
  }
}
