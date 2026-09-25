import type { IEmailEnviadoRepositorio } from "@/dominio/repositorios/IEmailEnviadoRepositorio";
import type { INotificacionRepositorio } from "@/dominio/repositorios/INotificacionRepositorio";
import type { TipoNotificacion as TipoNotificacionPersistida } from "@/dominio/entidades/Notificacion";

/**
 * Cómo se ve cada ítem del centro del nutricionista.
 *
 * CORREO puede ser derivado (un correo que falló, leído de `emails_enviados`)
 * o persistido (la bienvenida que no salió); el resto sale de
 * `notificaciones`, que es una tabla propia con estado de visto.
 */
export type TipoNotificacion = "MENSAJE" | "CORREO" | "WHATSAPP" | "TURNO";

/**
 * Ítem del centro de notificaciones: una vista unificada de una señal que ya
 * vive en su propia tabla. No es una entidad persistida: es un read-model de
 * solo lectura.
 */
export interface Notificacion {
  /** Id único entre tipos (prefijado por origen) para el `key` de la UI. */
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  detalle: string;
  fecha: Date;
  /** Ruta a la que navega el ítem (null si solo tiene acciones en el lugar). */
  enlace: string | null;
  pacienteId: string | null;
  /** Mensajes sin leer de la conversación (solo para el tipo MENSAJE). */
  noLeidos: number | null;
  /**
   * Id crudo de la notificación persistida, para marcarla vista desde la
   * campana. Null en los correos fallidos, que son derivados y no tienen
   * estado de visto.
   */
  notificacionId: string | null;
  /** Si ya se vio. Los derivados no tienen este estado y van en `null`. */
  vista: boolean | null;
}

/** Centro de notificaciones: feed ordenado + contador de pendientes. */
export interface CentroNotificaciones {
  items: Notificacion[];
  /**
   * Cantidad para el badge de la campana: las notificaciones sin ver. Los
   * correos fallidos no tienen estado de "leído", así que no inflan el
   * contador de forma permanente.
   */
  total: number;
}

/** Cuántos correos recientes se traen para el feed. */
const LIMITE_CORREOS = 8;

/** Cuántas notificaciones persistidas se traen para el feed. */
const LIMITE_NOTIFICACIONES = 30;

/** Cómo se ve en el feed cada tipo de notificación persistida. */
const TIPO_EN_EL_FEED: Record<TipoNotificacionPersistida, TipoNotificacion> = {
  WHATSAPP_ENTRANTE: "WHATSAPP",
  TURNO_CONFIRMADO: "TURNO",
  MENSAJE_APP: "MENSAJE",
  REPROGRAMACION_PEDIDA: "TURNO",
  TURNO_CANCELADO: "TURNO",
  CANCELACION_PEDIDA: "TURNO",
  BIENVENIDA_FALLIDA: "CORREO",
};

/**
 * Caso de uso: arma el centro de notificaciones del nutricionista uniendo las
 * señales que le importan en un único feed ordenado por fecha (más nuevo
 * primero).
 *
 * Las fuentes son de dos clases y conviene no confundirlas:
 *
 * - **Derivadas**: los correos fallidos. No tienen fila propia acá; se leen de
 *   su tabla.
 * - **Persistidas** (`notificaciones`): mensajes, WhatsApp, turnos y la
 *   bienvenida que no salió. Son hechos que ocurrieron y no se recalculan,
 *   así que llevan su propio estado de "visto" y se apagan marcándolas.
 *
 * **Las alertas de seguimiento NO están acá.** Estuvieron, y se sacaron: son
 * un estado del paciente («no registra el peso hace 15 días») que se trabaja
 * con tiempo, en el panel del dashboard, y no algo que acaba de pasar. En la
 * campana competían con los avisos que sí son urgentes (el paciente te
 * escribió, canceló el turno) y le ganaban por cantidad.
 *
 * Los mensajes del chat ESTUVIERON del lado derivado y se movieron: mientras lo
 * que los sostenía era el contador de no leídos, abrir la conversación los
 * borraba del feed, y los otros avisos del mismo paciente quedaban marcados
 * como vistos. Dos señales del mismo tipo no pueden comportarse distinto en la
 * misma campana.
 */
export class ObtenerCentroDeNotificaciones {
  constructor(
    private readonly emails: IEmailEnviadoRepositorio,
    private readonly notificaciones: INotificacionRepositorio,
  ) {}

  /**
   * No recibe `viewerId`: el alcance de inquilino ya acota todo al consultorio,
   * y desde que los mensajes del chat son notificaciones persistidas no queda
   * nada que dependa de QUIÉN mira. Ojo con eso si alguna vez hay dos
   * profesionales en el mismo consultorio: los avisos son del consultorio, así
   * que uno que marca visto lo marca para los dos.
   */
  async ejecutar(): Promise<CentroNotificaciones> {
    const [correos, persistidas, sinVer] = await Promise.all([
      this.emails.listarRecientes(LIMITE_CORREOS),
      this.notificaciones.listarRecientes(LIMITE_NOTIFICACIONES),
      // Se cuenta aparte y no sobre la lista de arriba: aquella está acotada
      // a LIMITE_NOTIFICACIONES, así que con más pendientes que ese límite el
      // globo mostraría de menos.
      this.notificaciones.contarNoVistas(),
    ]);

    const items: Notificacion[] = [];

    for (const correo of correos) {
      const e = correo.aPrimitivos();
      // Solo los correos que FALLARON son accionables (un mail que no llegó al
      // paciente). Los envíos exitosos son un registro automático (recordatorios,
      // bienvenidas): no van a la campana para no llenarla de ruido — quedan en
      // el historial de envíos de Recordatorios.
      if (e.error == null) continue;
      items.push({
        id: `correo:${e.id}`,
        tipo: "CORREO",
        titulo: "Falló un envío de correo",
        detalle: `${e.para}: ${e.error}`,
        fecha: e.creadoEn,
        enlace: "/dashboard/recordatorios",
        pacienteId: e.pacienteId,
        noLeidos: null,
        notificacionId: null,
        vista: null,
      });
    }

    // Las persistidas se muestran vistas y no vistas: la campana es también el
    // registro de lo que pasó, y una notificación que desaparece apenas se la
    // mira no deja volver a buscarla. Lo que cambia al verla es que deja de
    // contar para el globo (y la UI la muestra apagada).
    for (const notificacion of persistidas) {
      const n = notificacion.aPrimitivos();
      items.push({
        id: `notificacion:${n.id}`,
        tipo: TIPO_EN_EL_FEED[n.tipo],
        titulo: n.titulo,
        detalle: n.detalle,
        fecha: n.creadoEn,
        enlace: n.enlace,
        pacienteId: n.pacienteId,
        noLeidos: null,
        notificacionId: n.id,
        vista: n.vistoEn !== null,
      });
    }

    items.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

    return { items, total: sinVer };
  }
}
