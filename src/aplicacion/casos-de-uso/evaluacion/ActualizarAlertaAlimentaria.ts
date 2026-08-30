import type { IAlertaAlimentariaRepositorio } from "@/dominio/repositorios/IAlertaAlimentariaRepositorio";
import type {
  AlertaAlimentaria,
  DatosNuevaAlertaAlimentaria,
} from "@/dominio/entidades/AlertaAlimentaria";
import { ErrorAlertaAlimentariaNoEncontrada } from "@/dominio/errores/ErrorAlertaAlimentariaNoEncontrada";

/** Cambios aplicables a una alerta existente. */
export type CambiosAlertaAlimentaria = Partial<
  Omit<DatosNuevaAlertaAlimentaria, "pacienteId">
>;

/** Caso de uso: actualizar una alerta alimentaria existente. */
export class ActualizarAlertaAlimentaria {
  constructor(private readonly alertas: IAlertaAlimentariaRepositorio) {}

  async ejecutar(
    id: string,
    cambios: CambiosAlertaAlimentaria,
  ): Promise<AlertaAlimentaria> {
    const existente = await this.alertas.obtenerPorId(id);
    if (!existente) {
      throw new ErrorAlertaAlimentariaNoEncontrada(id);
    }
    return this.alertas.actualizar(existente.actualizar(cambios));
  }
}
