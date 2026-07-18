import type { ISuplementoRepositorio } from "../../repositorios/ISuplementoRepositorio";
import type { Suplemento, DatosNuevoSuplemento } from "../../entidades/Suplemento";
import { ErrorSuplementoNoEncontrado } from "../../errores/ErrorSuplementoNoEncontrado";

/** Datos de entrada: id + cambios (incluye activar/desactivar). */
export interface DatosActualizarSuplemento
  extends Omit<DatosNuevoSuplemento, "pacienteId"> {
  id: string;
}

/** Caso de uso: actualizar (o finalizar, con activo=false) un suplemento. */
export class ActualizarSuplemento {
  constructor(private readonly suplementos: ISuplementoRepositorio) {}

  async ejecutar(datos: DatosActualizarSuplemento): Promise<Suplemento> {
    const existente = await this.suplementos.obtenerPorId(datos.id);
    if (!existente) {
      throw new ErrorSuplementoNoEncontrado(datos.id);
    }
    return this.suplementos.actualizar(existente.actualizar(datos));
  }
}
