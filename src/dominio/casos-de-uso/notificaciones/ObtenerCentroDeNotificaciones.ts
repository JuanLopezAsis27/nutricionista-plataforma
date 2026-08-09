import type { IAlertaSeguimientoRepositorio } from "../../repositorios/IAlertaSeguimientoRepositorio";
import type { IMensajeriaRepositorio } from "../../repositorios/IMensajeriaRepositorio";
import type { IEmailEnviadoRepositorio } from "../../repositorios/IEmailEnviadoRepositorio";
import type { TipoAlertaSeguimiento } from "../../entidades/AlertaSeguimiento";

/** Origen de una notificación del centro del nutricionista. */
export type TipoNotificacion = "ALERTA" | "MENSAJE" | "CORREO";

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
}

/** Centro de notificaciones: feed ordenado + contador de pendientes accionables. */
export interface CentroNotificaciones {
  items: Notificacion[];
  /**
   * Cantidad para el badge de la campana: alertas pendientes + conversaciones
   * con mensajes sin leer. Los correos son un registro informativo (no tienen
   * estado de "leído"), así que no inflan el contador de forma permanente.
   */
  total: number;
}

const ETIQUETA_ALERTA: Record<TipoAlertaSeguimiento, string> = {
  SIN_REGISTRO_PESO: "Sin registro de peso",
  SIN_ACTIVIDAD: "Sin actividad",
  PLAN_VENCIDO: "Plan vencido",
  TURNO_SIN_CONFIRMAR: "Turno sin confirmar",
};

/** Cuántos correos recientes se traen para el feed. */
const LIMITE_CORREOS = 8;

/**
 * Caso de uso: arma el centro de notificaciones del nutricionista uniendo las
 * señales que le importan —alertas de seguimiento, mensajes de pacientes sin
 * leer y avisos de correo— en un único feed ordenado por fecha (más nuevo
 * primero). Cada origen conserva su tabla; acá solo se leen y se combinan.
 */
export class ObtenerCentroDeNotificaciones {
  constructor(
    private readonly alertas: IAlertaSeguimientoRepositorio,
    private readonly mensajeria: IMensajeriaRepositorio,
    private readonly emails: IEmailEnviadoRepositorio,
  ) {}

  async ejecutar(viewerId: string): Promise<CentroNotificaciones> {
    const [alertas, conversaciones, correos] = await Promise.all([
      this.alertas.listarPendientes(),
      this.mensajeria.listarResumen(viewerId),
      this.emails.listarRecientes(LIMITE_CORREOS),
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
      });
    }

    const conNoLeidos = conversaciones.filter((c) => c.noLeidos > 0);
    for (const c of conNoLeidos) {
      items.push({
        id: `mensaje:${c.id}`,
        tipo: "MENSAJE",
        titulo: c.pacienteNombre,
        detalle: c.ultimoMensajeTexto ?? "Nuevo mensaje",
        // Si no hubiera fecha (no debería, si hay no-leídos), va al final.
        fecha: c.ultimoMensajeEn ?? new Date(0),
        // Deep-link: abre directamente la conversación de ese paciente.
        enlace: `/dashboard/mensajes?paciente=${c.pacienteId}`,
        alertaId: null,
        pacienteId: c.pacienteId,
        noLeidos: c.noLeidos,
      });
    }

    for (const correo of correos) {
      const e = correo.aPrimitivos();
      // Solo los correos que FALLARON son accionables (un mail que no llegó al
      // paciente). Los envíos exitosos son un registro automático (recordatorios,
      // bienvenidas): no van a la campana para no llenarla de ruido — quedan en
      // el log de Secretaría.
      if (e.error == null) continue;
      items.push({
        id: `correo:${e.id}`,
        tipo: "CORREO",
        titulo: "Falló un envío de correo",
        detalle: `${e.para}: ${e.error}`,
        fecha: e.creadoEn,
        enlace: "/dashboard/plantillas",
        alertaId: null,
        pacienteId: e.pacienteId,
        noLeidos: null,
      });
    }

    items.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

    return { items, total: alertas.length + conNoLeidos.length };
  }
}
