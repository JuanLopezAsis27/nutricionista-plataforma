import type { IEvolucionRepositorio } from "@/dominio/repositorios/IEvolucionRepositorio";
import type {
  Evolucion,
  DatosNuevaEvolucion,
} from "@/dominio/entidades/Evolucion";
import { ErrorEvolucionNoEncontrada } from "@/dominio/errores/ErrorEvolucionNoEncontrada";
import { ErrorEvolucionDuplicada } from "@/dominio/errores/ErrorEvolucionDuplicada";

/** Cambios de entrada: los campos de la evolución. */
export type CambiosEvolucion = Partial<Omit<DatosNuevaEvolucion, "pacienteId">>;

/** Caso de uso: editar una evolución ya registrada. */
export class ActualizarEvolucion {
  constructor(private readonly evoluciones: IEvolucionRepositorio) {}

  async ejecutar(id: string, cambios: CambiosEvolucion): Promise<Evolucion> {
    const existente = await this.evoluciones.obtenerPorId(id);
    if (!existente) {
      throw new ErrorEvolucionNoEncontrada(id);
    }

    const actualizada = existente.actualizar(cambios);

    // Mover la fecha a un día que ya tiene evolución es el mismo choque que al
    // registrar; `excluirId` deja fuera a la propia, que si no chocaría consigo
    // misma cuando la fecha no cambió.
    if (
      await this.evoluciones.existeEnFecha(
        actualizada.pacienteId,
        actualizada.fecha,
        id,
      )
    ) {
      throw new ErrorEvolucionDuplicada(actualizada.fecha);
    }

    return await this.evoluciones.actualizar(actualizada);
  }
}
