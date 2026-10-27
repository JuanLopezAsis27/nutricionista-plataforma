import type { IDeporteRepositorio } from "@/dominio/repositorios/IDeporteRepositorio";
import type { Deporte } from "@/dominio/entidades/Deporte";

/**
 * Caso de uso: la lista de deportes de la plataforma, por nombre. La usan el
 * buscador del perfil deportivo (todos los consultorios) y el panel del
 * SUPERADMIN. Es corta: viaja entera y se filtra en la pantalla.
 */
export class ListarDeportes {
  constructor(private readonly deportes: IDeporteRepositorio) {}

  ejecutar(): Promise<Deporte[]> {
    return this.deportes.listar();
  }
}
