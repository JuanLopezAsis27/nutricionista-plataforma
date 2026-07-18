import type { IObjetivoRepositorio } from "../../repositorios/IObjetivoRepositorio";
import { ErrorObjetivoNoEncontrado } from "../../errores/ErrorObjetivoNoEncontrado";
import { ErrorValidacion } from "../../errores/ErrorValidacion";

/**
 * Caso de uso: eliminar una estrategia de un objetivo.
 * El historial registra ESTRATEGIA_ELIMINADA (la traza no se pierde).
 */
export class EliminarEstrategia {
  constructor(private readonly objetivos: IObjetivoRepositorio) {}

  async ejecutar(datos: { objetivoId: string; estrategiaId: string }): Promise<void> {
    const objetivo = await this.objetivos.obtenerPorId(datos.objetivoId);
    if (!objetivo) {
      throw new ErrorObjetivoNoEncontrado(datos.objetivoId);
    }

    const estrategia = objetivo.estrategias.find((e) => e.id === datos.estrategiaId);
    if (!estrategia) {
      throw new ErrorValidacion("La estrategia no pertenece a este objetivo.");
    }

    await this.objetivos.eliminarEstrategia(datos.objetivoId, datos.estrategiaId, {
      tipo: "ESTRATEGIA_ELIMINADA",
      detalle: `Estrategia eliminada: «${estrategia.descripcion}».`,
    });
  }
}
