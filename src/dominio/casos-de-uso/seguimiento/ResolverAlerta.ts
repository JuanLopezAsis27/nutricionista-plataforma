import type { IAlertaSeguimientoRepositorio } from "../../repositorios/IAlertaSeguimientoRepositorio";
import type {
  AlertaSeguimiento,
  EstadoAlertaSeguimiento,
} from "../../entidades/AlertaSeguimiento";
import { ErrorAlertaSeguimientoNoEncontrada } from "../../errores/ErrorAlertaSeguimientoNoEncontrada";

/** Caso de uso: marcar una alerta como resuelta o descartada. */
export class ResolverAlerta {
  constructor(private readonly alertas: IAlertaSeguimientoRepositorio) {}

  async ejecutar(datos: {
    id: string;
    estado: Exclude<EstadoAlertaSeguimiento, "PENDIENTE">;
  }): Promise<AlertaSeguimiento> {
    const alerta = await this.alertas.obtenerPorId(datos.id);
    if (!alerta) {
      throw new ErrorAlertaSeguimientoNoEncontrada(datos.id);
    }
    return this.alertas.actualizar(alerta.resolver(datos.estado));
  }
}
