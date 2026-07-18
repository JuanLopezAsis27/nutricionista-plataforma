import type { IObjetivoRepositorio } from "../../repositorios/IObjetivoRepositorio";
import type { EventoObjetivo } from "../../entidades/Objetivo";
import { ErrorObjetivoNoEncontrado } from "../../errores/ErrorObjetivoNoEncontrado";

/** Caso de uso: historial de auditoría de un objetivo (línea de tiempo). */
export class ObtenerHistorialObjetivo {
  constructor(private readonly objetivos: IObjetivoRepositorio) {}

  async ejecutar(objetivoId: string): Promise<EventoObjetivo[]> {
    const objetivo = await this.objetivos.obtenerPorId(objetivoId);
    if (!objetivo) {
      throw new ErrorObjetivoNoEncontrado(objetivoId);
    }
    return this.objetivos.listarHistorial(objetivoId);
  }
}
