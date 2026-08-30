import type { IAlertaSeguimientoRepositorio } from "@/dominio/repositorios/IAlertaSeguimientoRepositorio";
import type {
  AlertaSeguimiento,
  EstadoAlertaSeguimiento,
} from "@/dominio/entidades/AlertaSeguimiento";
import { ErrorAlertaSeguimientoNoEncontrada } from "@/dominio/errores/ErrorAlertaSeguimientoNoEncontrada";

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
