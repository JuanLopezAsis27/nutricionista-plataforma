import type { IUsuarioRepositorio } from "../../repositorios/IUsuarioRepositorio";
import { Usuario } from "../../entidades/Usuario";
import { ErrorUsuarioNoEncontrado } from "../../errores/ErrorUsuarioNoEncontrado";

/**
 * Caso de uso (SUPERADMIN): activar o desactivar una cuenta de nutricionista.
 * Un nutricionista desactivado no puede iniciar sesión (ver auth.ts).
 */
export class CambiarEstadoNutricionista {
  constructor(private readonly usuarios: IUsuarioRepositorio) {}

  async ejecutar(id: string, activo: boolean): Promise<Usuario> {
    const usuario = await this.usuarios.obtenerPorId(id);
    if (!usuario || usuario.rol !== "NUTRICIONISTA") {
      throw new ErrorUsuarioNoEncontrado(id);
    }
    return this.usuarios.actualizar(usuario.cambiarActivo(activo));
  }
}
