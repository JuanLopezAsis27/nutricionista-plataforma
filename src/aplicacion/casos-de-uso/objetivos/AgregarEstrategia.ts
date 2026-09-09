import type { IObjetivoRepositorio } from "@/dominio/repositorios/IObjetivoRepositorio";
import {
  Objetivo,
  type EstrategiaObjetivo,
} from "@/dominio/entidades/Objetivo";
import { ErrorObjetivoNoEncontrado } from "@/dominio/errores/ErrorObjetivoNoEncontrado";

export interface DatosAgregarEstrategia {
  objetivoId: string;
  descripcion: string;
  /** Obligatorio: por qué se eligió esta estrategia para este paciente. */
  motivo: string;
}

/**
 * Caso de uso: agregar una estrategia a un objetivo.
 * La entidad exige el motivo; el historial registra ESTRATEGIA_AGREGADA.
 */
export class AgregarEstrategia {
  constructor(private readonly objetivos: IObjetivoRepositorio) {}

  async ejecutar(datos: DatosAgregarEstrategia): Promise<EstrategiaObjetivo> {
    const objetivo = await this.objetivos.obtenerPorId(datos.objetivoId);
    if (!objetivo) {
      throw new ErrorObjetivoNoEncontrado(datos.objetivoId);
    }

    const estrategia = Objetivo.crearEstrategia(datos, crypto.randomUUID());
    await this.objetivos.agregarEstrategia(datos.objetivoId, estrategia, {
      tipo: "ESTRATEGIA_AGREGADA",
      detalle: `Estrategia agregada: «${estrategia.descripcion}».`,
      motivo: estrategia.motivo,
    });
    return estrategia;
  }
}
