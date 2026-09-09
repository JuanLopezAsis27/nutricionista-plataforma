import type { IObjetivoRepositorio } from "@/dominio/repositorios/IObjetivoRepositorio";
import type {
  EstadoEstrategia,
  EstrategiaObjetivo,
} from "@/dominio/entidades/Objetivo";
import { ErrorObjetivoNoEncontrado } from "@/dominio/errores/ErrorObjetivoNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

export interface DatosCambiarEstadoEstrategia {
  objetivoId: string;
  estrategiaId: string;
  estado: EstadoEstrategia;
  /** Obligatorio: por qué se logró o se descartó. */
  motivo: string;
}

/**
 * Caso de uso: cambiar el estado de una estrategia (lograda, descartada,
 * reactivada). El motivo es OBLIGATORIO y queda en el historial.
 */
export class CambiarEstadoEstrategia {
  constructor(private readonly objetivos: IObjetivoRepositorio) {}

  async ejecutar(
    datos: DatosCambiarEstadoEstrategia,
  ): Promise<EstrategiaObjetivo> {
    const motivo = datos.motivo?.trim() ?? "";
    if (motivo.length === 0) {
      throw new ErrorValidacion(
        "Indicá el motivo del cambio de estado de la estrategia.",
      );
    }

    const objetivo = await this.objetivos.obtenerPorId(datos.objetivoId);
    if (!objetivo) {
      throw new ErrorObjetivoNoEncontrado(datos.objetivoId);
    }

    const estrategia = objetivo.estrategias.find(
      (e) => e.id === datos.estrategiaId,
    );
    if (!estrategia) {
      throw new ErrorValidacion("La estrategia no pertenece a este objetivo.");
    }
    if (estrategia.estado === datos.estado) {
      throw new ErrorValidacion(
        `La estrategia ya está en estado ${datos.estado}.`,
      );
    }

    const actualizada: EstrategiaObjetivo = {
      ...estrategia,
      estado: datos.estado,
    };
    await this.objetivos.actualizarEstrategia(datos.objetivoId, actualizada, {
      tipo: "ESTRATEGIA_CAMBIO_ESTADO",
      detalle: `Estrategia «${estrategia.descripcion}»: ${estrategia.estado} → ${datos.estado}.`,
      motivo,
    });
    return actualizada;
  }
}
