import type { IMaterialRepositorio } from "@/dominio/repositorios/IMaterialRepositorio";
import type { MaterialBiblioteca } from "@/dominio/entidades/MaterialBiblioteca";

/** Caso de uso: materiales compartidos con un paciente (portal). */
export class ObtenerMaterialesDelPaciente {
  constructor(private readonly materiales: IMaterialRepositorio) {}

  async ejecutar(pacienteId: string): Promise<MaterialBiblioteca[]> {
    return this.materiales.listarPorPaciente(pacienteId);
  }
}
