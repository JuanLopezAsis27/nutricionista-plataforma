import type { IArchivoRepositorio } from "../../repositorios/IArchivoRepositorio";
import type { IRecetaRepositorio } from "../../repositorios/IRecetaRepositorio";
import type { IMaterialRepositorio } from "../../repositorios/IMaterialRepositorio";
import type { IPlanRepositorio } from "../../repositorios/IPlanRepositorio";

/** Identidad del paciente que intenta leer el archivo. */
export interface SolicitanteArchivo {
  usuarioId: string;
  pacienteId: string | null;
}

/**
 * Caso de uso: ¿puede un usuario PACIENTE ver este archivo?
 *
 * Reglas (se amplían fase a fase al sumar dueños):
 *  - siempre puede ver lo que subió él mismo (ej: fotos de su diario);
 *  - puede ver las fotos de una receta que le fue compartida;
 *  - puede ver el archivo de un material de biblioteca que le fue compartido;
 *  - puede ver el PDF del plan que tiene asignado HOY.
 *
 * Lo del plan es deliberadamente el plan ACTIVO y no cualquiera que haya
 * tenido: el PDF es la indicación vigente, y dejar abierto el de un plan
 * finalizado es dejar al paciente siguiendo un plan que ya se cambió.
 *
 * El rol NUTRICIONISTA no pasa por acá (accede a todo).
 */
export class PuedeVerArchivoPaciente {
  constructor(
    private readonly archivos: IArchivoRepositorio,
    private readonly recetas: IRecetaRepositorio,
    private readonly materiales: IMaterialRepositorio,
    private readonly planes: IPlanRepositorio,
  ) {}

  async ejecutar(
    archivoId: string,
    solicitante: SolicitanteArchivo,
  ): Promise<boolean> {
    const archivo = await this.archivos.obtenerPorId(archivoId);
    if (!archivo) return false;

    if (archivo.subidoPorId === solicitante.usuarioId) return true;
    if (!solicitante.pacienteId) return false;

    const dueno = await this.archivos.obtenerDueno(archivoId);
    if (dueno?.recetaId) {
      const asignados = await this.recetas.listarPacientesAsignados(
        dueno.recetaId,
      );
      return asignados.includes(solicitante.pacienteId);
    }
    if (dueno?.materialId) {
      const asignados = await this.materiales.listarPacientesAsignados(
        dueno.materialId,
      );
      return asignados.includes(solicitante.pacienteId);
    }
    if (dueno?.planId) {
      const activo = await this.planes.obtenerAsignacionActiva(
        solicitante.pacienteId,
      );
      return activo?.planId === dueno.planId;
    }
    return false;
  }
}
