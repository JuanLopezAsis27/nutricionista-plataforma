import type { ICampoHistoriaClinicaRepositorio } from "@/dominio/repositorios/ICampoHistoriaClinicaRepositorio";
import { ErrorCampoHistoriaClinicaNoEncontrado } from "@/dominio/errores/ErrorCampoHistoriaClinicaNoEncontrado";

/**
 * Caso de uso: sacar un campo personalizado del consultorio.
 *
 * Borra la DEFINICIÓN: deja de pedirse en la historia de los pacientes, pero
 * lo que ya estaba cargado sigue guardado y visible en cada ficha, porque el
 * valor lleva su propia etiqueta. Es información clínica ya escrita y no se
 * borra por reordenar un formulario.
 */
export class EliminarCampoHistoriaClinica {
  constructor(private readonly campos: ICampoHistoriaClinicaRepositorio) {}

  async ejecutar(id: string): Promise<void> {
    const existente = await this.campos.obtenerPorId(id);
    if (!existente) {
      throw new ErrorCampoHistoriaClinicaNoEncontrado(id);
    }
    await this.campos.eliminar(id);
  }
}
