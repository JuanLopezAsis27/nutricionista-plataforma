import type { ICampoEvolucionRepositorio } from "@/dominio/repositorios/ICampoEvolucionRepositorio";
import type { CampoEvolucion } from "@/dominio/entidades/CampoEvolucion";

/**
 * Caso de uso: los campos personalizados que el consultorio agregó a las
 * evoluciones, en el orden en que se muestran.
 */
export class ObtenerCamposEvolucion {
  constructor(private readonly campos: ICampoEvolucionRepositorio) {}

  async ejecutar(): Promise<CampoEvolucion[]> {
    return this.campos.obtenerTodos();
  }
}
