import { ErrorValidacion } from "../errores/ErrorValidacion";

/**
 * Estado del recordatorio. Es una escala que solo AVANZA, y cuánto avanza
 * depende del canal:
 *
 *   * Enlace wa.me — WhatsApp nunca le devuelve nada a la app, así que el
 *     envío no se detecta: se declara. PREPARADO significa "se abrió el chat
 *     con el mensaje cargado", nunca "se envió"; eso lo dice el profesional
 *     (ENVIADO) o lo desmiente (DESCARTADO).
 *   * Cloud API — el mensaje sale solo y el webhook informa ENVIADO →
 *     ENTREGADO → LEIDO, o FALLIDO con el motivo de Meta.
 *
 * Los dos últimos escalones no son del canal sino del PACIENTE: RESPONDIDO es
 * que escribió después del recordatorio y CONFIRMADO es que esa respuesta —o
 * el profesional a mano— dejó dicho que viene. Es la diferencia entre "le
 * llegó" y "contestó", que es justamente lo que hay que mirar antes de
 * liberar el horario.
 */
export const ESTADOS_RECORDATORIO_WHATSAPP = [
  "PREPARADO",
  "ENVIADO",
  "ENTREGADO",
  "LEIDO",
  "RESPONDIDO",
  "CONFIRMADO",
  "DESCARTADO",
  "FALLIDO",
] as const;
export type EstadoRecordatorioWhatsapp =
  (typeof ESTADOS_RECORDATORIO_WHATSAPP)[number];

/** Quién disparó el envío. */
export const ORIGENES_RECORDATORIO = ["MANUAL", "AUTOMATICO"] as const;
export type OrigenRecordatorio = (typeof ORIGENES_RECORDATORIO)[number];

/**
 * Orden de avance de la escala. Los webhooks de Meta llegan desordenados
 * (`delivered` después de `read` es habitual), así que un estado nunca
 * retrocede. DESCARTADO y FALLIDO quedan fuera de la escala: son salidas, no
 * escalones, y se aplican con sus propios métodos.
 */
const ORDEN: Record<EstadoRecordatorioWhatsapp, number> = {
  PREPARADO: 0,
  ENVIADO: 1,
  ENTREGADO: 2,
  LEIDO: 3,
  RESPONDIDO: 4,
  CONFIRMADO: 5,
  DESCARTADO: -1,
  FALLIDO: -1,
};

/** Estados en los que el recordatorio ya llegó (o al menos salió) al paciente. */
const SALIO: ReadonlySet<EstadoRecordatorioWhatsapp> =
  new Set<EstadoRecordatorioWhatsapp>([
    "ENVIADO",
    "ENTREGADO",
    "LEIDO",
    "RESPONDIDO",
    "CONFIRMADO",
  ]);

/** Datos para registrar un recordatorio recién preparado. */
export interface DatosRecordatorioWhatsapp {
  turnoId: string;
  pacienteId: string;
  telefono: string;
  mensaje: string;
  usuarioId: string | null;
  /** wamid, cuando el mensaje salió por la API oficial. */
  idExterno?: string | null;
  origen?: OrigenRecordatorio;
  /**
   * Escalón de la programación con el que salió ("3 días antes" → 3). null en
   * los envíos manuales; es esa nulidad la que deja insistir a mano sin chocar
   * con el índice único que impide el duplicado automático.
   */
  diasAntes?: number | null;
  plantillaId?: string | null;
  /** PREPARADO con enlace wa.me; ENVIADO cuando la API ya lo despachó. */
  estado?: EstadoRecordatorioWhatsapp;
}

/** Estado completo de un recordatorio persistido. */
export interface PropiedadesRecordatorioWhatsapp {
  id: string;
  turnoId: string;
  pacienteId: string;
  telefono: string;
  mensaje: string;
  estado: EstadoRecordatorioWhatsapp;
  /**
   * Quién lo disparó. Nullable porque el log es de auditoría y sobrevive al
   * borrado de ese usuario (la FK es ON DELETE SET NULL, no CASCADE), y porque
   * los envíos del barrido no tienen detrás a ninguna persona.
   */
  usuarioId: string | null;
  idExterno: string | null;
  origen: OrigenRecordatorio;
  diasAntes: number | null;
  plantillaId: string | null;
  error: string | null;
  creadoEn: Date;
  confirmadoEn: Date | null;
  respondidoEn: Date | null;
}

/**
 * Entidad de dominio RecordatorioWhatsapp: una entrada del log de
 * recordatorios de turno enviados por WhatsApp.
 *
 * Guarda el texto y el teléfono efectivamente usados (auditoría) y es donde
 * aterrizan los estados de entrega que informa la Cloud API.
 *
 * Invariante: un recordatorio ya resuelto (DESCARTADO) no se vuelve a
 * resolver; para insistir se prepara uno nuevo. Un FALLIDO sí se puede
 * reintentar, y el reintento REUSA la fila en vez de insertar otra: es lo que
 * permite convivir con el índice único que impide mandar dos veces el mismo
 * escalón de la programación.
 */
export class RecordatorioWhatsapp {
  private constructor(
    private readonly props: PropiedadesRecordatorioWhatsapp,
  ) {}

  static crear(
    datos: DatosRecordatorioWhatsapp,
    id: string,
    ahora: Date = new Date(),
  ): RecordatorioWhatsapp {
    const mensaje = datos.mensaje?.trim() ?? "";
    if (mensaje.length === 0) {
      throw new ErrorValidacion(
        "El recordatorio no puede tener un mensaje vacío.",
      );
    }
    const telefono = datos.telefono?.trim() ?? "";
    if (telefono.length === 0) {
      throw new ErrorValidacion(
        "El recordatorio necesita un teléfono de destino.",
      );
    }

    return new RecordatorioWhatsapp({
      id,
      turnoId: datos.turnoId,
      pacienteId: datos.pacienteId,
      telefono,
      mensaje,
      estado: datos.estado ?? "PREPARADO",
      usuarioId: datos.usuarioId,
      idExterno: datos.idExterno ?? null,
      origen: datos.origen ?? "MANUAL",
      diasAntes: datos.diasAntes ?? null,
      plantillaId: datos.plantillaId ?? null,
      error: null,
      creadoEn: ahora,
      confirmadoEn: datos.estado === "ENVIADO" ? ahora : null,
      respondidoEn: null,
    });
  }

  static reconstruir(
    props: PropiedadesRecordatorioWhatsapp,
  ): RecordatorioWhatsapp {
    return new RecordatorioWhatsapp(props);
  }

  /**
   * Avanza el estado de entrega. Nunca retrocede: los webhooks de Meta llegan
   * desordenados. Devuelve la MISMA instancia si el estado no avanza, para que
   * quien llama pueda saltearse el UPDATE.
   */
  registrarEstado(
    estado: EstadoRecordatorioWhatsapp,
    ahora: Date = new Date(),
  ): RecordatorioWhatsapp {
    if (this.props.estado === "DESCARTADO") return this;
    if (ORDEN[estado] <= ORDEN[this.props.estado]) return this;

    return new RecordatorioWhatsapp({
      ...this.props,
      estado,
      error: null,
      confirmadoEn:
        this.props.confirmadoEn ?? (SALIO.has(estado) ? ahora : null),
      respondidoEn:
        estado === "RESPONDIDO" || estado === "CONFIRMADO"
          ? (this.props.respondidoEn ?? ahora)
          : this.props.respondidoEn,
    });
  }

  /** El profesional declara que envió el mensaje (canal enlace wa.me). */
  confirmarEnvio(ahora: Date = new Date()): RecordatorioWhatsapp {
    if (this.props.estado !== "PREPARADO") {
      throw new ErrorValidacion("Este recordatorio ya fue resuelto.");
    }
    return new RecordatorioWhatsapp({
      ...this.props,
      estado: "ENVIADO",
      confirmadoEn: ahora,
    });
  }

  /** El profesional declara que finalmente no lo envió. */
  descartar(ahora: Date = new Date()): RecordatorioWhatsapp {
    if (this.props.estado !== "PREPARADO") {
      throw new ErrorValidacion("Este recordatorio ya fue resuelto.");
    }
    return new RecordatorioWhatsapp({
      ...this.props,
      estado: "DESCARTADO",
      confirmadoEn: ahora,
    });
  }

  /** El proveedor rechazó el envío; queda registrado y se puede reintentar. */
  registrarFallo(
    motivo: string,
    ahora: Date = new Date(),
  ): RecordatorioWhatsapp {
    return new RecordatorioWhatsapp({
      ...this.props,
      estado: "FALLIDO",
      error: motivo,
      confirmadoEn: ahora,
    });
  }

  /**
   * Reintento de un envío fallido sobre la MISMA fila. Reusar la fila no es
   * una optimización: el índice único (turno, diasAntes) existe justamente
   * para que un escalón de la programación no pueda insertarse dos veces, así
   * que el reintento no tiene dónde escribir salvo acá.
   */
  reintentar(
    datos: {
      mensaje: string;
      telefono: string;
      idExterno?: string | null;
      enviado: boolean;
    },
    ahora: Date = new Date(),
  ): RecordatorioWhatsapp {
    return new RecordatorioWhatsapp({
      ...this.props,
      mensaje: datos.mensaje,
      telefono: datos.telefono,
      idExterno: datos.idExterno ?? null,
      estado: datos.enviado ? "ENVIADO" : "PREPARADO",
      error: null,
      creadoEn: ahora,
      confirmadoEn: datos.enviado ? ahora : null,
      respondidoEn: null,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get turnoId(): string {
    return this.props.turnoId;
  }
  get pacienteId(): string {
    return this.props.pacienteId;
  }
  get estado(): EstadoRecordatorioWhatsapp {
    return this.props.estado;
  }
  get diasAntes(): number | null {
    return this.props.diasAntes;
  }
  get creadoEn(): Date {
    return this.props.creadoEn;
  }
  /** Se abrió el chat y todavía no se sabe si salió (solo canal enlace). */
  get pendiente(): boolean {
    return this.props.estado === "PREPARADO";
  }

  /**
   * El aviso LLEGÓ a salir hacia el paciente.
   *
   * Es la única pregunta que decide si hay historia que preservar. Un
   * PREPARADO (chat abierto, nadie confirmó), un DESCARTADO y un FALLIDO no le
   * llegaron a nadie: son el mismo aviso pendiente, y el intento siguiente los
   * pisa en lugar de apilar una fila más.
   */
  get salio(): boolean {
    return SALIO.has(this.props.estado);
  }

  /**
   * Cuándo salió el aviso, para medir el margen antes de repetirlo. Se usa
   * `confirmadoEn` —el momento en que se supo que salió— y no `creadoEn`, que
   * con el enlace wa.me es cuando se abrió el chat y puede ser mucho antes.
   */
  get salioEn(): Date | null {
    if (!this.salio) return null;
    return this.props.confirmadoEn ?? this.props.creadoEn;
  }

  aPrimitivos(): PropiedadesRecordatorioWhatsapp {
    return { ...this.props };
  }
}
