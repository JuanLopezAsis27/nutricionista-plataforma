import type { IGrupoPlanRepositorio } from "@/dominio/repositorios/IGrupoPlanRepositorio";
import { GrupoPlan, type DatosGrupoPlan } from "@/dominio/entidades/GrupoPlan";
import { ErrorGrupoPlanDuplicado } from "@/dominio/errores/ErrorGrupoPlanDuplicado";

/** Caso de uso: crear una carpeta de planes. */
export class CrearGrupoPlan {
  constructor(private readonly grupos: IGrupoPlanRepositorio) {}

  async ejecutar(datos: DatosGrupoPlan): Promise<GrupoPlan> {
    const grupo = GrupoPlan.crear(datos, crypto.randomUUID());
    // El índice único es la garantía dura; esto da el mensaje entendible.
    if (await this.grupos.existeNombre(grupo.nombre)) {
      throw new ErrorGrupoPlanDuplicado(grupo.nombre);
    }
    return this.grupos.crear(grupo);
  }
}
