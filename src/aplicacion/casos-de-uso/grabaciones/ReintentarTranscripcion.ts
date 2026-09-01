import type { IGrabacionConsultaRepositorio } from "@/dominio/repositorios/IGrabacionConsultaRepositorio";
import type { IColaTrabajos } from "@/dominio/servicios/IColaTrabajos";
import type { GrabacionConsulta } from "@/dominio/entidades/GrabacionConsulta";
import { ErrorGrabacionNoEncontrada } from "@/dominio/errores/ErrorGrabacionNoEncontrada";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { COLA_TRANSCRIBIR_GRABACION } from "./RegistrarGrabacion";

/**
 * Caso de uso: volver a intentar una transcripción que quedó fallida.
 *
 * Reinicia el contador de intentos a propósito: el pedido a mano suele venir
 * DESPUÉS de haber arreglado la causa —cargar la clave del proveedor, subir el
 * saldo—, así que arrancar con los intentos agotados haría fallar el primer
 * reintento y volvería a dejarla fallida.
 */
export class ReintentarTranscripcion {
  constructor(
    private readonly grabaciones: IGrabacionConsultaRepositorio,
    private readonly cola: IColaTrabajos,
  ) {}

  async ejecutar(id: string): Promise<GrabacionConsulta> {
    const grabacion = await this.grabaciones.obtenerPorId(id);
    if (!grabacion) {
      throw new ErrorGrabacionNoEncontrada(id);
    }
    if (grabacion.estado === "LISTA") {
      throw new ErrorValidacion("Esa grabación ya está transcrita.");
    }

    const reiniciada = await this.grabaciones.guardar(grabacion.reintentar());
    await this.cola.encolar(COLA_TRANSCRIBIR_GRABACION, {
      grabacionId: reiniciada.id,
    });
    return reiniciada;
  }
}
