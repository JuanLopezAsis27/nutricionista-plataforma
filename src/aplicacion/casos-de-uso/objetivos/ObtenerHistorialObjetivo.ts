import type { IObjetivoRepositorio } from "@/dominio/repositorios/IObjetivoRepositorio";
import type { EventoObjetivo } from "@/dominio/entidades/Objetivo";
import { ErrorObjetivoNoEncontrado } from "@/dominio/errores/ErrorObjetivoNoEncontrado";

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
