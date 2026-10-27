import type { IDeporteRepositorio } from "@/dominio/repositorios/IDeporteRepositorio";
import type { IPerfilDeportivoRepositorio } from "@/dominio/repositorios/IPerfilDeportivoRepositorio";
import { ErrorDeporteNoEncontrado } from "@/dominio/errores/ErrorDeporteNoEncontrado";
import { ErrorDeporteEnUso } from "@/dominio/errores/ErrorDeporteEnUso";

/**
 * Caso de uso: borrar un deporte de la lista de la plataforma.
 *
 * Solo si ningún perfil deportivo lo usa, de NINGÚN consultorio: el perfil
 * exige un deporte, y dejar a esos pacientes sin uno (o pasarlos a otro sin
 * preguntar) cambiaría fichas que no son del SUPERADMIN. La FK es RESTRICT,
 * así que la base también lo frena; esto da el mensaje con cuántos lo usan.
 */
export class EliminarDeporte {
  constructor(
    private readonly deportes: IDeporteRepositorio,
    private readonly perfiles: IPerfilDeportivoRepositorio,
  ) {}

  async ejecutar(id: string): Promise<void> {
    const deporte = await this.deportes.obtenerPorId(id);
    if (!deporte) throw new ErrorDeporteNoEncontrado(id);
    const enUso = await this.perfiles.contarPorDeporte(id);
    if (enUso > 0) throw new ErrorDeporteEnUso(deporte.nombre, enUso);
    await this.deportes.eliminar(id);
  }
}
