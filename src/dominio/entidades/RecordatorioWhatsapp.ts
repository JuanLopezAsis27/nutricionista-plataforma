import { ErrorValidacion } from "../errores/ErrorValidacion";

/**
 * Estado del recordatorio. El enlace wa.me no devuelve nada a la app, así que
 * PREPARADO significa "se abrió el chat con el mensaje", no "se envió": eso lo
 * declara el profesional (CONFIRMADO) o lo desmiente (DESCARTADO).
 */
export const ESTADOS_RECORDATORIO_WHATSAPP = ["PREPARADO", "CONFIRMADO", "DESCARTADO"] as const;
export type EstadoRecordatorioWhatsapp = (typeof ESTADOS_RECORDATORIO_WHATSAPP)[number];

/** Datos para registrar un recordatorio recién preparado. */
export interface DatosRecordatorioWhatsapp {
  turnoId: string;
  pacienteId: string;
  telefono: string;
  mensaje: string;
  usuarioId: string;
  /** wamid, cuando el mensaje salió por la API oficial. */
  idExterno?: string | null;
}

/** Estado completo de un recordatorio persistido. */
export interface PropiedadesRecordatorioWhatsapp {
  id: string;
  turnoId: string;
  pacienteId: string;
  telefono: string;
  mensaje: string;
  estado: EstadoRecordatorioWhatsapp;
  usuarioId: string;
  idExterno: string | null;
  creadoEn: Date;
  confirmadoEn: Date | null;
}

/**
 * Entidad de dominio RecordatorioWhatsapp: una entrada del log de
 * recordatorios de turno abiertos por WhatsApp.
 *
 * Guarda el texto y el teléfono efectivamente usados (auditoría) y es donde
 * aterrizarán los estados reales de entrega cuando entre la API oficial.
 *
 * Invariante: un recordatorio ya resuelto (CONFIRMADO o DESCARTADO) no se
 * vuelve a resolver; para insistir se prepara uno nuevo.
 */
export class RecordatorioWhatsapp {
  private constructor(private readonly props: PropiedadesRecordatorioWhatsapp) {}

  static crear(
    datos: DatosRecordatorioWhatsapp,
    id: string,
    ahora: Date = new Date(),
  ): RecordatorioWhatsapp {
    const mensaje = datos.mensaje?.trim() ?? "";
    if (mensaje.length === 0) {
      throw new ErrorValidacion("El recordatorio no puede tener un mensaje vacío.");
    }
    const telefono = datos.telefono?.trim() ?? "";
    if (telefono.length === 0) {
      throw new ErrorValidacion("El recordatorio necesita un teléfono de destino.");
    }

    return new RecordatorioWhatsapp({
      id,
      turnoId: datos.turnoId,
      pacienteId: datos.pacienteId,
      telefono,
      mensaje,
      estado: "PREPARADO",
      usuarioId: datos.usuarioId,
      idExterno: datos.idExterno ?? null,
      creadoEn: ahora,
      confirmadoEn: null,
    });
  }

  static reconstruir(props: PropiedadesRecordatorioWhatsapp): RecordatorioWhatsapp {
    return new RecordatorioWhatsapp(props);
  }

  /** El profesional declara que envió el mensaje. */
  confirmar(ahora: Date = new Date()): RecordatorioWhatsapp {
    return this.resolver("CONFIRMADO", ahora);
  }

  /** El profesional declara que finalmente no lo envió. */
  descartar(ahora: Date = new Date()): RecordatorioWhatsapp {
    return this.resolver("DESCARTADO", ahora);
  }

  private resolver(
    estado: EstadoRecordatorioWhatsapp,
    ahora: Date,
  ): RecordatorioWhatsapp {
    if (this.props.estado !== "PREPARADO") {
      throw new ErrorValidacion("Este recordatorio ya fue resuelto.");
    }
    return new RecordatorioWhatsapp({ ...this.props, estado, confirmadoEn: ahora });
  }

  get id(): string {
    return this.props.id;
  }
  get turnoId(): string {
    return this.props.turnoId;
  }
  get estado(): EstadoRecordatorioWhatsapp {
    return this.props.estado;
  }
  get pendiente(): boolean {
    return this.props.estado === "PREPARADO";
  }

  aPrimitivos(): PropiedadesRecordatorioWhatsapp {
    return { ...this.props };
  }
}
