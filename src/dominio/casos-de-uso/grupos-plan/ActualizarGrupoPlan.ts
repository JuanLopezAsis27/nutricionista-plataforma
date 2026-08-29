import type { IGrupoPlanRepositorio } from "../../repositorios/IGrupoPlanRepositorio";
import type { GrupoPlan, DatosGrupoPlan } from "../../entidades/GrupoPlan";
import { ErrorGrupoPlanNoEncontrado } from "../../errores/ErrorGrupoPlanNoEncontrado";
import { ErrorGrupoPlanDuplicado } from "../../errores/ErrorGrupoPlanDuplicado";

/** Entrada: id de la carpeta + sus datos. */
export interface DatosActualizarGrupoPlan extends DatosGrupoPlan {
  id: string;
}

/** Caso de uso: renombrar o redescribir una carpeta de planes. */
export class ActualizarGrupoPlan {
  constructor(private readonly grupos: IGrupoPlanRepositorio) {}

  async ejecutar(datos: DatosActualizarGrupoPlan): Promise<GrupoPlan> {
    const existente = await this.grupos.obtenerPorId(datos.id);
    if (!existente) {
      throw new ErrorGrupoPlanNoEncontrado(datos.id);
    }
    const actualizado = existente.actualizar(datos);
    // `excluirId` la deja guardar sin renombrarse: sin eso, editar la
    // descripción chocaría contra su propio nombre.
    if (await this.grupos.existeNombre(actualizado.nombre, actualizado.id)) {
      throw new ErrorGrupoPlanDuplicado(actualizado.nombre);
    }
    return this.grupos.actualizar(actualizado);
  }
}
