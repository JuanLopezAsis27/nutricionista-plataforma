import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import type { IRecetaRepositorio } from "@/dominio/repositorios/IRecetaRepositorio";
import type { IMaterialRepositorio } from "@/dominio/repositorios/IMaterialRepositorio";
import type { IAsignacionPlanRepositorio } from "@/dominio/repositorios/IAsignacionPlanRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";

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
 *  - puede ver la FOTO DE PERFIL de cualquier cuenta del consultorio;
 *  - puede ver las fotos de una receta que le fue compartida;
 *  - puede ver el archivo de un material de biblioteca que le fue compartido;
 *  - puede ver el PDF del plan que tiene asignado HOY.
 *
 * Lo del plan es deliberadamente el plan ACTIVO y no cualquiera que haya
 * tenido: el PDF es la indicación vigente, y dejar abierto el de un plan
 * finalizado es dejar al paciente siguiendo un plan que ya se cambió.
 *
 * La foto de perfil es la única regla que NO pasa por el arco de dueños: la
 * foto de perfil es un archivo huérfano y la FK vive en `usuarios`
 * (migración 53), así que se pregunta por el otro lado. El alcance de
 * inquilino es lo que la acota: `esFotoDePerfil` solo ve las cuentas del
 * consultorio en curso, y por eso el paciente ve la cara de SU nutricionista y
 * no la de cualquier otro.
 *
 * El rol NUTRICIONISTA no pasa por acá (accede a todo).
 */
export class PuedeVerArchivoPaciente {
  constructor(
    private readonly archivos: IArchivoRepositorio,
    private readonly recetas: IRecetaRepositorio,
    private readonly materiales: IMaterialRepositorio,
    private readonly planes: IAsignacionPlanRepositorio,
    private readonly usuarios: IUsuarioRepositorio,
  ) {}

  async ejecutar(
    archivoId: string,
    solicitante: SolicitanteArchivo,
  ): Promise<boolean> {
    const archivo = await this.archivos.obtenerPorId(archivoId);
    if (!archivo) return false;

    if (archivo.subidoPorId === solicitante.usuarioId) return true;

    // Antes del corte por `pacienteId`: una foto de perfil es visible para
    // cualquier usuario del consultorio, tenga ficha asociada o no.
    if (await this.usuarios.esFotoDePerfil(archivoId)) return true;

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
