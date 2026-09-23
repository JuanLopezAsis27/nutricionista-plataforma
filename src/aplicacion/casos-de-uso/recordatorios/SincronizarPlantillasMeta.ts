import type { IAdministradorPlantillasMeta } from "@/dominio/servicios/IAdministradorPlantillasMeta";
import type { RegistrarEstadosPlantillasMeta } from "./RegistrarEstadosPlantillasMeta";

/**
 * Caso de uso: traer de Meta el estado de todas las plantillas.
 *
 * Es el respaldo del webhook: si la app de Meta no está suscripta a
 * `message_template_status_update` —o el aviso se perdió—, el profesional
 * aprieta «Actualizar estado» y ve lo mismo que en el Administrador de
 * WhatsApp.
 */
export class SincronizarPlantillasMeta {
  constructor(
    private readonly administrador: IAdministradorPlantillasMeta,
    private readonly registrar: RegistrarEstadosPlantillasMeta,
  ) {}

  async ejecutar(ahora: Date = new Date()): Promise<number> {
    const remotas = await this.administrador.listar();
    return this.registrar.ejecutar(remotas, { completa: true, ahora });
  }
}
