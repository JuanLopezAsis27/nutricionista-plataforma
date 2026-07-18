import type { IArchivoRepositorio } from "../../repositorios/IArchivoRepositorio";
import type { IRecetaRepositorio } from "../../repositorios/IRecetaRepositorio";
import type { IMaterialRepositorio } from "../../repositorios/IMaterialRepositorio";

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
 *  - puede ver el archivo de un material de biblioteca que le fue compartido.
 * El rol NUTRICIONISTA no pasa por acá (accede a todo).
 */
export class PuedeVerArchivoPaciente {
  constructor(
    private readonly archivos: IArchivoRepositorio,
    private readonly recetas: IRecetaRepositorio,
    private readonly materiales: IMaterialRepositorio,
  ) {}

  async ejecutar(archivoId: string, solicitante: SolicitanteArchivo): Promise<boolean> {
    const archivo = await this.archivos.obtenerPorId(archivoId);
    if (!archivo) return false;

    if (archivo.subidoPorId === solicitante.usuarioId) return true;
    if (!solicitante.pacienteId) return false;

    const dueno = await this.archivos.obtenerDueno(archivoId);
    if (dueno?.recetaId) {
      const asignados = await this.recetas.listarPacientesAsignados(dueno.recetaId);
      return asignados.includes(solicitante.pacienteId);
    }
    if (dueno?.materialId) {
      const asignados = await this.materiales.listarPacientesAsignados(dueno.materialId);
      return asignados.includes(solicitante.pacienteId);
    }
    return false;
  }
}
