import type { IAlertaSeguimientoRepositorio } from "@/dominio/repositorios/IAlertaSeguimientoRepositorio";

/** Caso de uso: cantidad de alertas pendientes (contador de la campana). */
export class ContarAlertasPendientes {
  constructor(private readonly alertas: IAlertaSeguimientoRepositorio) {}

  async ejecutar(): Promise<number> {
    return this.alertas.contarPendientes();
  }
}
