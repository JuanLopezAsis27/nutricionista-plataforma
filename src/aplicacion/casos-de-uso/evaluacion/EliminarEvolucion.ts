import type { IEvolucionRepositorio } from "@/dominio/repositorios/IEvolucionRepositorio";
import { ErrorEvolucionNoEncontrada } from "@/dominio/errores/ErrorEvolucionNoEncontrada";

/** Caso de uso: borrar una evolución de control. */
export class EliminarEvolucion {
  constructor(private readonly evoluciones: IEvolucionRepositorio) {}

  async ejecutar(id: string): Promise<void> {
    const existente = await this.evoluciones.obtenerPorId(id);
    if (!existente) {
      throw new ErrorEvolucionNoEncontrada(id);
    }
    await this.evoluciones.eliminar(id);
  }
}
