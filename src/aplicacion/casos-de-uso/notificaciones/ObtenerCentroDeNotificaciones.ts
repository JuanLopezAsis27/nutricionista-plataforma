import type { IAlertaSeguimientoRepositorio } from "@/dominio/repositorios/IAlertaSeguimientoRepositorio";
import type { IEmailEnviadoRepositorio } from "@/dominio/repositorios/IEmailEnviadoRepositorio";
import type { INotificacionRepositorio } from "@/dominio/repositorios/INotificacionRepositorio";
import type { TipoAlertaSeguimiento } from "@/dominio/entidades/AlertaSeguimiento";
import type { TipoNotificacion as TipoNotificacionPersistida } from "@/dominio/entidades/Notificacion";

/**
 * Origen de un ítem del centro del nutricionista.
 *
 * Los tres primeros son señales DERIVADAS de otras tablas (una alerta
 * pendiente, una conversación con no-leídos, un correo que falló); los dos
 * últimos salen de `notificaciones`, que es una tabla propia con estado de
 * visto. La diferencia importa al marcar algo como atendido: cada tipo se
 * apaga de una manera distinta.
 */
export type TipoNotificacion =
  "ALERTA" | "MENSAJE" | "CORREO" | "WHATSAPP" | "TURNO";

/**
 * Ítem del centro de notificaciones: una vista unificada de una señal que ya
 * vive en su propia tabla (alerta de seguimiento, mensaje sin leer, correo
 * enviado). No es una entidad persistida: es un read-model de solo lectura.
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
  /** Id crudo de la alerta, para resolver/descartar desde la campana. */
  alertaId: string | null;
  pacienteId: string | null;
  /** Mensajes sin leer de la conversación (solo para el tipo MENSAJE). */
  noLeidos: number | null;
  /**
   * Id crudo de la notificación persistida, para marcarla vista desde la
   * campana. Null en los tipos derivados (ALERTA, MENSAJE, CORREO), que se
   * apagan cada uno por su lado: resolviendo la alerta o leyendo el mensaje.
   */
  notificacionId: string | null;
  /** Si ya se vio. Los tipos derivados no tienen este estado y van en `null`. */
  vista: boolean | null;
}

/** Centro de notificaciones: feed ordenado + contador de pendientes accionables. */
export interface CentroNotificaciones {
  items: Notificacion[];
  /**
   * Cantidad para el badge de la campana: alertas pendientes + notificaciones
   * sin ver (mensajes de la app, WhatsApp y turnos confirmados). Los correos
   * son un registro informativo (no tienen estado de "leído"), así que no
   * inflan el contador de forma permanente.
   */
  total: number;
}

const ETIQUETA_ALERTA: Record<TipoAlertaSeguimiento, string> = {
  SIN_REGISTRO_PESO: "Sin registro de peso",
  SIN_ACTIVIDAD: "Sin actividad",
  TURNO_SIN_CONFIRMAR: "Turno sin confirmar",
};

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
};

/**
 * Caso de uso: arma el centro de notificaciones del nutricionista uniendo las
 * señales que le importan en un único feed ordenado por fecha (más nuevo
 * primero).
 *
 * Las fuentes son de dos clases y conviene no confundirlas:
 *
 * - **Derivadas**: alertas de seguimiento pendientes y correos fallidos. No
 *   tienen fila propia acá; se leen de su tabla y desaparecen del feed cuando
 *   se resuelve el hecho que las genera.
 * - **Persistidas** (`notificaciones`): mensaje del chat de la app, WhatsApp
 *   entrante y turno confirmado. Son hechos que ocurrieron y no se recalculan,
 *   así que llevan su propio estado de "visto" y se apagan marcándolas.
 *
 * Los mensajes del chat ESTUVIERON del lado derivado y se movieron: mientras lo
 * que los sostenía era el contador de no leídos, abrir la conversación los
 * borraba del feed, y los otros dos avisos del mismo paciente quedaban marcados
 * como vistos. Dos señales del mismo tipo no pueden comportarse distinto en la
 * misma campana.
 */
export class ObtenerCentroDeNotificaciones {
  constructor(
    private readonly alertas: IAlertaSeguimientoRepositorio,
    private readonly emails: IEmailEnviadoRepositorio,
    private readonly notificaciones: INotificacionRepositorio,
  ) {}

  /**
   * No recibe `viewerId`: el alcance de inquilino ya acota todo al consultorio,
   * y desde que los mensajes del chat son notificaciones persistidas no queda
   * nada que dependa de QUIÉN mira. Ojo con eso si alguna vez hay dos
   * profesionales en el mismo consultorio: los avisos son del consultorio, así
   * que uno que marca visto lo marca para los dos —igual que las alertas—.
   */
  async ejecutar(): Promise<CentroNotificaciones> {
    const [alertas, correos, persistidas, sinVer] = await Promise.all([
      this.alertas.listarPendientes(),
      this.emails.listarRecientes(LIMITE_CORREOS),
      this.notificaciones.listarRecientes(LIMITE_NOTIFICACIONES),
      // Se cuenta aparte y no sobre la lista de arriba: aquella está acotada
      // a LIMITE_NOTIFICACIONES, así que con más pendientes que ese límite el
      // globo mostraría de menos.
      this.notificaciones.contarNoVistas(),
    ]);

    const items: Notificacion[] = [];

    for (const alerta of alertas) {
      const a = alerta.aPrimitivos();
      items.push({
        id: `alerta:${a.id}`,
        tipo: "ALERTA",
        titulo: ETIQUETA_ALERTA[a.tipo],
        detalle: a.detalle,
        fecha: a.creadoEn,
        enlace: `/dashboard/pacientes/${a.pacienteId}`,
        alertaId: a.id,
        pacienteId: a.pacienteId,
        noLeidos: null,
        notificacionId: null,
        vista: null,
      });
    }

    // Los mensajes del chat de la app NO se derivan más de las conversaciones
    // sin leer: ahora son notificaciones persistidas (`MENSAJE_APP`) y entran
    // con el resto, más abajo. Derivarlos era lo que los hacía DESAPARECER al
    // abrir la conversación —lo que los sostenía era el contador de no leídos—,
    // mientras los otros dos avisos del paciente quedaban marcados como vistos.
    // El contador sin leer no se pierde: sigue en la bandeja de Mensajes, que
    // es donde se responde.

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
        alertaId: null,
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
        alertaId: null,
        pacienteId: n.pacienteId,
        noLeidos: null,
        notificacionId: n.id,
        vista: n.vistoEn !== null,
      });
    }

    items.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

    return {
      items,
      total: alertas.length + sinVer,
    };
  }
}
