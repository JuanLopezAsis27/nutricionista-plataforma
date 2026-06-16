import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Estados posibles de un turno (independiente del enum de Prisma). */
export const ESTADOS_TURNO = [
  "PENDIENTE",
  "CONFIRMADO",
  "CANCELADO",
  "COMPLETADO",
] as const;
export type EstadoTurno = (typeof ESTADOS_TURNO)[number];

/** Datos necesarios para agendar un turno nuevo. */
export interface DatosNuevoTurno {
  pacienteId: string;
  fecha: Date;
  hora: string; // formato HH:mm (24h)
  duracionMinutos?: number;
  notas?: string | null;
}

/** Estado completo de un turno ya persistido. */
export interface PropiedadesTurno {
  id: string;
  pacienteId: string;
  fecha: Date;
  hora: string;
  duracionMinutos: number;
  estado: EstadoTurno;
  notas: string | null;
  creadoEn: Date;
}

const PATRON_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Entidad de dominio Turno.
 *
 * La regla "no pueden existir dos turnos en el mismo horario" requiere
 * consultar el repositorio, por lo que se valida en el caso de uso
 * AgendarTurno. Acá se validan los invariantes locales: hora válida,
 * duración positiva y transiciones de estado coherentes.
 */
export class Turno {
  private constructor(private readonly props: PropiedadesTurno) {}

  static crear(datos: DatosNuevoTurno, id: string, ahora: Date = new Date()): Turno {
    if (!datos.pacienteId) {
      throw new ErrorValidacion("El turno debe estar asociado a un paciente.");
    }
    if (!PATRON_HORA.test(datos.hora)) {
      throw new ErrorValidacion("La hora del turno debe tener formato HH:mm.");
    }
    const duracion = datos.duracionMinutos ?? 30;
    if (!Number.isInteger(duracion) || duracion <= 0) {
      throw new ErrorValidacion("La duración del turno debe ser un entero positivo.");
    }

    return new Turno({
      id,
      pacienteId: datos.pacienteId,
      fecha: datos.fecha,
      hora: datos.hora,
      duracionMinutos: duracion,
      estado: "PENDIENTE",
      notas: datos.notas?.trim() || null,
      creadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesTurno): Turno {
    return new Turno(props);
  }

  /**
   * Máquina de estados del turno. Transiciones permitidas:
   *   PENDIENTE  → CONFIRMADO | CANCELADO
   *   CONFIRMADO → COMPLETADO | CANCELADO
   *   CANCELADO  → (ninguna, estado final)
   *   COMPLETADO → (ninguna, estado final)
   */
  private static readonly TRANSICIONES: Record<EstadoTurno, ReadonlyArray<EstadoTurno>> = {
    PENDIENTE: ["CONFIRMADO", "CANCELADO"],
    CONFIRMADO: ["COMPLETADO", "CANCELADO"],
    CANCELADO: [],
    COMPLETADO: [],
  };

  /** Cambia el estado validando que la transición sea legal. */
  cambiarEstado(nuevoEstado: EstadoTurno): void {
    const permitidos = Turno.TRANSICIONES[this.props.estado];
    if (!permitidos.includes(nuevoEstado)) {
      throw new ErrorValidacion(
        `Transición de estado no permitida: ${this.props.estado} → ${nuevoEstado}.`,
      );
    }
    this.props.estado = nuevoEstado;
  }

  /** Indica si el turno puede cancelarse (solo PENDIENTE o CONFIRMADO). */
  puedeCancelarse(): boolean {
    return this.props.estado === "PENDIENTE" || this.props.estado === "CONFIRMADO";
  }

  /** Indica si el turno puede reprogramarse (solo PENDIENTE o CONFIRMADO). */
  puedeReprogramarse(): boolean {
    return this.props.estado === "PENDIENTE" || this.props.estado === "CONFIRMADO";
  }

  /**
   * Cambia la fecha, hora y/o duración del turno (reprogramación).
   * Solo es válido sobre turnos PENDIENTE o CONFIRMADO. Valida la hora y la
   * duración igual que en la creación. No verifica solapamiento: eso lo hace
   * el caso de uso con el repositorio.
   */
  reprogramar(datos: { fecha: Date; hora: string; duracionMinutos?: number }): void {
    if (!this.puedeReprogramarse()) {
      throw new ErrorValidacion(
        `No se puede reprogramar un turno en estado ${this.props.estado}.`,
      );
    }
    if (!PATRON_HORA.test(datos.hora)) {
      throw new ErrorValidacion("La hora del turno debe tener formato HH:mm.");
    }
    const duracion = datos.duracionMinutos ?? this.props.duracionMinutos;
    if (!Number.isInteger(duracion) || duracion <= 0) {
      throw new ErrorValidacion("La duración del turno debe ser un entero positivo.");
    }
    this.props.fecha = datos.fecha;
    this.props.hora = datos.hora;
    this.props.duracionMinutos = duracion;
  }

  /** Cancela el turno (atajo semántico sobre cambiarEstado). */
  cancelar(): void {
    this.cambiarEstado("CANCELADO");
  }

  /** Determina si este turno se solapa en el tiempo con otro. */
  seSolapaCon(otro: Turno): boolean {
    if (this.props.fecha.getTime() !== otro.props.fecha.getTime()) {
      return false;
    }
    const inicioA = this.minutosDesdeMedianoche();
    const finA = inicioA + this.props.duracionMinutos;
    const inicioB = otro.minutosDesdeMedianoche();
    const finB = inicioB + otro.props.duracionMinutos;
    return inicioA < finB && inicioB < finA;
  }

  private minutosDesdeMedianoche(): number {
    const [horas, minutos] = this.props.hora.split(":").map(Number);
    return (horas ?? 0) * 60 + (minutos ?? 0);
  }

  get id(): string {
    return this.props.id;
  }
  get pacienteId(): string {
    return this.props.pacienteId;
  }
  get fecha(): Date {
    return this.props.fecha;
  }
  get hora(): string {
    return this.props.hora;
  }
  get duracionMinutos(): number {
    return this.props.duracionMinutos;
  }
  get estado(): EstadoTurno {
    return this.props.estado;
  }
  get notas(): string | null {
    return this.props.notas;
  }
  get creadoEn(): Date {
    return this.props.creadoEn;
  }

  aPrimitivos(): PropiedadesTurno {
    return { ...this.props };
  }
}
