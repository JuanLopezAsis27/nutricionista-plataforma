import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Calidad del sueño autoreportada. */
export const CALIDADES_SUENO = ["MALA", "REGULAR", "BUENA"] as const;
export type CalidadSueno = (typeof CALIDADES_SUENO)[number];

/** Intensidad de la actividad física. */
export const INTENSIDADES_ACTIVIDAD = ["BAJA", "MODERADA", "ALTA"] as const;
export type IntensidadActividad = (typeof INTENSIDADES_ACTIVIDAD)[number];

/** Franjas sugeridas para las comidas (el campo admite texto libre). */
export const FRANJAS_SUGERIDAS = [
  "Desayuno",
  "Media mañana",
  "Almuerzo",
  "Merienda",
  "Cena",
  "Colación",
] as const;

const PATRON_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Comida registrada en el diario (hijo del agregado). */
export interface ComidaConsumida {
  id: string;
  franja: string;
  hora: string | null;
  descripcion: string;
  /** Id del Archivo con la foto (null si no tiene). */
  fotoArchivoId: string | null;
  creadoEn: Date;
}

/** Datos para agregar una comida. */
export interface DatosNuevaComidaConsumida {
  franja: string;
  hora?: string | null;
  descripcion: string;
}

/** Actividad física registrada en el diario (hijo del agregado). */
export interface ActividadFisica {
  id: string;
  tipo: string;
  duracionMinutos: number;
  intensidad: IntensidadActividad | null;
  notas: string | null;
  creadoEn: Date;
}

/** Datos para agregar una actividad. */
export interface DatosNuevaActividadFisica {
  tipo: string;
  duracionMinutos: number;
  intensidad?: IntensidadActividad | null;
  notas?: string | null;
}

/** Campos escalares del día (todos opcionales). */
export interface EscalaresDia {
  pesoKg: number | null;
  aguaMl: number | null;
  horasSueno: number | null;
  calidadSueno: CalidadSueno | null;
  notas: string | null;
}

/** Datos para crear/actualizar la hoja del día. */
export interface DatosDia extends Partial<EscalaresDia> {
  pacienteId: string;
  fecha: Date;
}

/** Estado completo del registro persistido. */
export interface PropiedadesRegistroDiario extends EscalaresDia {
  id: string;
  pacienteId: string;
  fecha: Date;
  comidas: ComidaConsumida[];
  actividades: ActividadFisica[];
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Entidad de dominio Registro Diario (raíz de agregado): la hoja de un día
 * del paciente — peso autoreportado, agua, sueño y notas, con comidas y
 * actividades como hijos que se agregan/quitan de a uno (así las fotos ya
 * vinculadas nunca se pierden al editar los escalares).
 *
 * La fecha la envía el cliente (huso horario del paciente); se admite hasta
 * un día "futuro" respecto del server para tolerar la diferencia horaria.
 */
export class RegistroDiario {
  private constructor(private readonly props: PropiedadesRegistroDiario) {}

  static crear(datos: DatosDia, id: string, ahora: Date = new Date()): RegistroDiario {
    if (!datos.pacienteId?.trim()) {
      throw new ErrorValidacion("El registro debe pertenecer a un paciente.");
    }
    validarFecha(datos.fecha, ahora);
    validarEscalares(datos);

    return new RegistroDiario({
      id,
      pacienteId: datos.pacienteId,
      fecha: datos.fecha,
      pesoKg: datos.pesoKg ?? null,
      aguaMl: datos.aguaMl ?? null,
      horasSueno: datos.horasSueno ?? null,
      calidadSueno: datos.calidadSueno ?? null,
      notas: datos.notas?.trim() || null,
      comidas: [],
      actividades: [],
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesRegistroDiario): RegistroDiario {
    return new RegistroDiario(props);
  }

  /** Versión con los escalares actualizados (hijos e identidad intactos). */
  actualizarEscalares(
    cambios: Partial<EscalaresDia>,
    ahora: Date = new Date(),
  ): RegistroDiario {
    const escalares: EscalaresDia = {
      pesoKg: cambios.pesoKg !== undefined ? cambios.pesoKg : this.props.pesoKg,
      aguaMl: cambios.aguaMl !== undefined ? cambios.aguaMl : this.props.aguaMl,
      horasSueno:
        cambios.horasSueno !== undefined ? cambios.horasSueno : this.props.horasSueno,
      calidadSueno:
        cambios.calidadSueno !== undefined
          ? cambios.calidadSueno
          : this.props.calidadSueno,
      notas: cambios.notas !== undefined ? cambios.notas?.trim() || null : this.props.notas,
    };
    validarEscalares(escalares);
    return new RegistroDiario({ ...this.props, ...escalares, actualizadoEn: ahora });
  }

  /** Valida y construye una comida del diario (el repositorio la persiste). */
  static crearComida(
    datos: DatosNuevaComidaConsumida,
    id: string,
    ahora: Date = new Date(),
  ): ComidaConsumida {
    const franja = datos.franja?.trim() ?? "";
    if (franja.length === 0) {
      throw new ErrorValidacion("Indicá la franja de la comida (desayuno, almuerzo…).");
    }
    const descripcion = datos.descripcion?.trim() ?? "";
    if (descripcion.length === 0) {
      throw new ErrorValidacion("Describí qué comiste.");
    }
    if (datos.hora && !PATRON_HORA.test(datos.hora)) {
      throw new ErrorValidacion("La hora debe tener formato HH:mm.");
    }
    return {
      id,
      franja,
      hora: datos.hora ?? null,
      descripcion,
      fotoArchivoId: null,
      creadoEn: ahora,
    };
  }

  /** Valida y construye una actividad física (el repositorio la persiste). */
  static crearActividad(
    datos: DatosNuevaActividadFisica,
    id: string,
    ahora: Date = new Date(),
  ): ActividadFisica {
    const tipo = datos.tipo?.trim() ?? "";
    if (tipo.length === 0) {
      throw new ErrorValidacion("Indicá el tipo de actividad (pesas, running…).");
    }
    if (
      !Number.isInteger(datos.duracionMinutos) ||
      datos.duracionMinutos < 1 ||
      datos.duracionMinutos > 1440
    ) {
      throw new ErrorValidacion("La duración debe ser entre 1 y 1440 minutos.");
    }
    if (datos.intensidad != null && !INTENSIDADES_ACTIVIDAD.includes(datos.intensidad)) {
      throw new ErrorValidacion(`Intensidad desconocida: ${datos.intensidad}.`);
    }
    return {
      id,
      tipo,
      duracionMinutos: datos.duracionMinutos,
      intensidad: datos.intensidad ?? null,
      notas: datos.notas?.trim() || null,
      creadoEn: ahora,
    };
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
  get comidas(): ReadonlyArray<ComidaConsumida> {
    return this.props.comidas;
  }
  get actividades(): ReadonlyArray<ActividadFisica> {
    return this.props.actividades;
  }

  aPrimitivos(): PropiedadesRegistroDiario {
    return {
      ...this.props,
      comidas: this.props.comidas.map((c) => ({ ...c })),
      actividades: this.props.actividades.map((a) => ({ ...a })),
    };
  }
}

function validarFecha(fecha: Date, ahora: Date): void {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
    throw new ErrorValidacion("La fecha del registro no es válida.");
  }
  // Tolerancia de +1 día: el "hoy" del paciente puede adelantar al del server.
  const limite =
    Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()) +
    24 * 60 * 60 * 1000;
  const dia = Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate());
  if (dia > limite) {
    throw new ErrorValidacion("La fecha del registro no puede ser futura.");
  }
}

function validarEscalares(datos: Partial<EscalaresDia>): void {
  if (datos.pesoKg != null && (datos.pesoKg < 20 || datos.pesoKg > 400)) {
    throw new ErrorValidacion("El peso debe estar entre 20 y 400 kg.");
  }
  if (datos.aguaMl != null) {
    if (!Number.isInteger(datos.aguaMl) || datos.aguaMl < 0 || datos.aguaMl > 10000) {
      throw new ErrorValidacion("El agua debe estar entre 0 y 10000 ml.");
    }
  }
  if (datos.horasSueno != null && (datos.horasSueno < 0 || datos.horasSueno > 24)) {
    throw new ErrorValidacion("Las horas de sueño deben estar entre 0 y 24.");
  }
  if (datos.calidadSueno != null && !CALIDADES_SUENO.includes(datos.calidadSueno)) {
    throw new ErrorValidacion(`Calidad de sueño desconocida: ${datos.calidadSueno}.`);
  }
}
