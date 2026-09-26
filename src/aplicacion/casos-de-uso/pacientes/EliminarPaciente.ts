import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { ICuentaPacienteRepositorio } from "@/dominio/repositorios/ICuentaPacienteRepositorio";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { esCuentaExclusiva } from "@/dominio/servicios/cuentaPaciente";

/**
 * Caso de uso: eliminar un paciente y su acceso al portal.
 * Verifica que exista antes de borrar (lanza ErrorPacienteNoEncontrado).
 *
 * La CUENTA se borra solo si este era su único consultorio. Si la persona se
 * atiende también en otro, se va esta ficha y la cuenta sigue apuntada por la
 * del otro consultorio y sigue entrando al otro con el mismo email y contraseña.
 */
export class EliminarPaciente {
  constructor(
    private readonly repositorio: IPacienteRepositorio,
    private readonly usuarios: IUsuarioRepositorio,
    private readonly cuentas: ICuentaPacienteRepositorio,
  ) {}

  async ejecutar(id: string): Promise<void> {
    const existente = await this.repositorio.obtenerPorId(id);
    if (!existente) {
      throw new ErrorPacienteNoEncontrado(id);
    }
    // Primero la cuenta (si es solo de acá), luego la ficha: con la ficha ya
    // borrada, este consultorio dejaría de ver la cuenta.
    const cuenta = await this.usuarios.obtenerPorPacienteId(id);
    if (
      cuenta &&
      esCuentaExclusiva(await this.cuentas.contarDeUsuario(cuenta.id))
    ) {
      await this.usuarios.eliminar(cuenta.id);
    }
    await this.repositorio.eliminar(id);
  }
}
