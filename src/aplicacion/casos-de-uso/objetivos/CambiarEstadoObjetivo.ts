import type { IObjetivoRepositorio } from "@/dominio/repositorios/IObjetivoRepositorio";
import type { Objetivo, EstadoObjetivo } from "@/dominio/entidades/Objetivo";
import { ErrorObjetivoNoEncontrado } from "@/dominio/errores/ErrorObjetivoNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

export interface DatosCambiarEstadoObjetivo {
  id: string;
  estado: EstadoObjetivo;
  /** Obligatorio: por qué se cumple, se abandona o se reabre. */
  motivo: string;
}

/**
 * Caso de uso: cambiar el estado de un objetivo (cumplido, abandonado,
 * reabierto). El motivo es OBLIGATORIO y queda en el historial.
 */
export class CambiarEstadoObjetivo {
  constructor(private readonly objetivos: IObjetivoRepositorio) {}

  async ejecutar(datos: DatosCambiarEstadoObjetivo): Promise<Objetivo> {
    const motivo = datos.motivo?.trim() ?? "";
    if (motivo.length === 0) {
      throw new ErrorValidacion("Indicá el motivo del cambio de estado.");
    }

    const existente = await this.objetivos.obtenerPorId(datos.id);
    if (!existente) {
      throw new ErrorObjetivoNoEncontrado(datos.id);
    }

    const estadoAnterior = existente.estado;
    const actualizado = existente.cambiarEstado(datos.estado);
    return this.objetivos.actualizar(actualizado, {
      tipo: "CAMBIO_ESTADO",
      detalle: `Estado: ${estadoAnterior} → ${datos.estado}.`,
      motivo,
    });
  }
}
