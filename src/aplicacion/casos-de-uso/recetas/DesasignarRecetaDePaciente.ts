import type { IRecetaRepositorio } from "@/dominio/repositorios/IRecetaRepositorio";

/** Caso de uso: dejar de compartir una receta con un paciente. */
export class DesasignarRecetaDePaciente {
  constructor(private readonly recetas: IRecetaRepositorio) {}

  async ejecutar(datos: {
    recetaId: string;
    pacienteId: string;
  }): Promise<void> {
    await this.recetas.desasignarDePaciente(datos.recetaId, datos.pacienteId);
  }
}
