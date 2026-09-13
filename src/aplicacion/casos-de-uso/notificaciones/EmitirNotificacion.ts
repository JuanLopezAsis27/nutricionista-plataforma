import type { INotificacionRepositorio } from "@/dominio/repositorios/INotificacionRepositorio";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import {
  Notificacion,
  type TipoNotificacion,
} from "@/dominio/entidades/Notificacion";

/** Entrada del caso de uso. */
export interface EntradaEmitirNotificacion {
  tipo: TipoNotificacion;
  titulo: string;
  detalle: string;
  pacienteId?: string | null;
  enlace?: string | null;
  /**
   * Si ya hay un aviso PENDIENTE del mismo tipo y del mismo paciente, lo
   * refresca en vez de abrir otro.
   *
   * Va en los avisos que se repiten en ráfaga —los mensajes—: un paciente que
   * escribe cinco veces seguidas tiene que dejar una línea en la campana, no
   * cinco. Los hechos que valen por sí mismos (un turno confirmado) NO lo usan:
   * ahí cada uno es un evento distinto y agruparlos escondería el segundo.
   *
   * Solo agrupa mientras no se vio: una vez visto, el aviso es historia y el
   * mensaje siguiente abre uno nuevo.
   */
  agruparMientrasNoSeVea?: boolean;
}

/**
 * Caso de uso: dejar un aviso para el nutricionista.
 *
 * Lo llaman los hechos que le importan y que hoy no dejaban rastro: que el
 * paciente escriba por WhatsApp y que confirme su turno.
 *
 * **Nunca lanza.** Es una decisión de diseño y no descuido: quien lo llama está
 * en medio de algo que ya salió bien y que no se puede deshacer —el mensaje ya
 * se guardó, el turno ya quedó confirmado—. Que falle el aviso no puede tirar
 * abajo esa operación ni devolverle un error al paciente, que no tiene nada que
 * ver ni nada que hacer al respecto. Es el mismo criterio con el que
 * `ConfirmarAsistenciaTurno` envuelve su email en un try/catch.
 *
 * Devuelve si pudo o no, para que el llamador lo registre si le interesa.
 */
export class EmitirNotificacion {
  constructor(
    private readonly notificaciones: INotificacionRepositorio,
    private readonly reloj: IRelojFecha,
  ) {}

  async ejecutar(entrada: EntradaEmitirNotificacion): Promise<boolean> {
    try {
      const ahora = this.reloj.ahora();

      if (entrada.agruparMientrasNoSeVea && entrada.pacienteId) {
        const pendiente = await this.notificaciones.obtenerNoVistaDe(
          entrada.pacienteId,
          entrada.tipo,
        );
        if (pendiente) {
          await this.notificaciones.actualizar(
            pendiente.refrescar(entrada.detalle, ahora),
          );
          return true;
        }
      }

      await this.notificaciones.crear(
        Notificacion.crear(
          {
            tipo: entrada.tipo,
            titulo: entrada.titulo,
            detalle: entrada.detalle,
            pacienteId: entrada.pacienteId ?? null,
            enlace: entrada.enlace ?? null,
          },
          crypto.randomUUID(),
          ahora,
        ),
      );
      return true;
    } catch (error) {
      console.error("[notificaciones] no se pudo emitir el aviso:", error);
      return false;
    }
  }
}
