import type { IAlertaSeguimientoRepositorio } from "../../repositorios/IAlertaSeguimientoRepositorio";
import type { AlertaSeguimiento } from "../../entidades/AlertaSeguimiento";

/** Caso de uso: alertas de seguimiento pendientes (campana del panel). */
export class ObtenerAlertasPendientes {
  constructor(private readonly alertas: IAlertaSeguimientoRepositorio) {}

  async ejecutar(): Promise<AlertaSeguimiento[]> {
    return this.alertas.listarPendientes();
  }
}
