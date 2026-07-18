import type { IObjetivoRepositorio } from "../../repositorios/IObjetivoRepositorio";
import type { Objetivo, CambiosObjetivo } from "../../entidades/Objetivo";
import { ErrorObjetivoNoEncontrado } from "../../errores/ErrorObjetivoNoEncontrado";

/** Datos de entrada: id + cambios editables (el estado se cambia aparte). */
export interface DatosActualizarObjetivo extends CambiosObjetivo {
  id: string;
}

/**
 * Caso de uso: actualizar los datos de un objetivo (título, descripción,
 * prioridad, fecha). Registra el evento ACTUALIZACION en el historial.
 */
export class ActualizarObjetivo {
  constructor(private readonly objetivos: IObjetivoRepositorio) {}

  async ejecutar(datos: DatosActualizarObjetivo): Promise<Objetivo> {
    const existente = await this.objetivos.obtenerPorId(datos.id);
    if (!existente) {
      throw new ErrorObjetivoNoEncontrado(datos.id);
    }
    const actualizado = existente.actualizar(datos);
    return this.objetivos.actualizar(actualizado, {
      tipo: "ACTUALIZACION",
      detalle: `Datos del objetivo actualizados («${actualizado.titulo}»).`,
    });
  }
}
