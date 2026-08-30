import type { IAlertaSeguimientoRepositorio } from "@/dominio/repositorios/IAlertaSeguimientoRepositorio";
import type { AlertaSeguimiento } from "@/dominio/entidades/AlertaSeguimiento";

/** Caso de uso: alertas de seguimiento pendientes (campana del panel). */
export class ObtenerAlertasPendientes {
  constructor(private readonly alertas: IAlertaSeguimientoRepositorio) {}

  async ejecutar(): Promise<AlertaSeguimiento[]> {
    return this.alertas.listarPendientes();
  }
}
