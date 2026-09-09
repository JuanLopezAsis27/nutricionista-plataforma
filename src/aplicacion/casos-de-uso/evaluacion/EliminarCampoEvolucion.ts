import type { ICampoEvolucionRepositorio } from "@/dominio/repositorios/ICampoEvolucionRepositorio";
import { ErrorCampoEvolucionNoEncontrado } from "@/dominio/errores/ErrorCampoEvolucionNoEncontrado";

/**
 * Caso de uso: sacar un campo personalizado de las evoluciones.
 *
 * Borra la DEFINICIÓN: deja de pedirse al cargar una evolución, pero lo que ya
 * estaba cargado sigue guardado y visible en cada consulta, porque el valor
 * lleva su propia etiqueta. Es información clínica ya escrita y no se borra
 * por reordenar un formulario.
 */
export class EliminarCampoEvolucion {
  constructor(private readonly campos: ICampoEvolucionRepositorio) {}

  async ejecutar(id: string): Promise<void> {
    const existente = await this.campos.obtenerPorId(id);
    if (!existente) {
      throw new ErrorCampoEvolucionNoEncontrado(id);
    }
    await this.campos.eliminar(id);
  }
}
