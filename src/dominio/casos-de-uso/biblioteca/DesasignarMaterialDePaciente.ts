import type { IMaterialRepositorio } from "../../repositorios/IMaterialRepositorio";

/** Caso de uso: dejar de compartir un material con un paciente. */
export class DesasignarMaterialDePaciente {
  constructor(private readonly materiales: IMaterialRepositorio) {}

  async ejecutar(datos: {
    materialId: string;
    pacienteId: string;
  }): Promise<void> {
    await this.materiales.desasignarDePaciente(
      datos.materialId,
      datos.pacienteId,
    );
  }
}
