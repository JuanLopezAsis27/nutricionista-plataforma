import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { Usuario } from "@/dominio/entidades/Usuario";

/** Caso de uso (SUPERADMIN): listar todas las cuentas de nutricionista. */
export class ListarNutricionistas {
  constructor(private readonly usuarios: IUsuarioRepositorio) {}

  ejecutar(): Promise<Usuario[]> {
    return this.usuarios.listarPorRol("NUTRICIONISTA");
  }
}
