import { ErrorValidacion } from "../errores/ErrorValidacion";

const PATRON_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Campos editables de la configuración del consultorio. */
export interface DatosConfiguracion {
  turnoDuracionMinutos: number;
  turnoPasoMinutos: number;
  atencionHoraDesde: string | null;
  atencionHoraHasta: string | null;
  /** Días laborables: 0=domingo … 6=sábado. */
  diasAtencion: number[];
  nombreProfesional: string | null;
  matricula: string | null;
  logoArchivoId: string | null;
  // Apariencia del PDF del plan.
  pdfColorPrimario: string | null;
  pdfSubtitulo: string | null;
  pdfPieTexto: string | null;
  pdfMostrarRecetas: boolean;
  pdfMostrarMacros: boolean;
  pdfMostrarEquivalencias: boolean;
  pdfMostrarRecomendaciones: boolean;
}

/** Estado completo persistido. */
export interface PropiedadesConfiguracion extends DatosConfiguracion {
  id: string;
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Entidad de dominio ConfiguracionConsultorio: preferencias del profesional
 * (singleton). Reemplaza los valores incrustados —como la duración de turno por
 * defecto— y guarda el membrete para PDF/emails.
 *
 * Invariantes: duración/paso 5–480 min; horas en HH:mm y no invertidas; días de
 * atención entre 0 y 6.
 */
export class ConfiguracionConsultorio {
  private constructor(private readonly props: PropiedadesConfiguracion) {}

  /** Configuración por defecto (cuando todavía no se guardó ninguna). */
  static porDefecto(ahora: Date = new Date()): ConfiguracionConsultorio {
    return new ConfiguracionConsultorio({
      id: crypto.randomUUID(),
      turnoDuracionMinutos: 30,
      turnoPasoMinutos: 15,
      atencionHoraDesde: null,
      atencionHoraHasta: null,
      diasAtencion: [1, 2, 3, 4, 5],
      nombreProfesional: null,
      matricula: null,
      logoArchivoId: null,
      pdfColorPrimario: null,
      pdfSubtitulo: null,
      pdfPieTexto: null,
      pdfMostrarRecetas: true,
      pdfMostrarMacros: true,
      pdfMostrarEquivalencias: true,
      pdfMostrarRecomendaciones: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesConfiguracion): ConfiguracionConsultorio {
    return new ConfiguracionConsultorio(props);
  }

  /** Copia con los cambios aplicados y validados (id/creadoEn intactos). */
  actualizar(
    cambios: Partial<DatosConfiguracion>,
    ahora: Date = new Date(),
  ): ConfiguracionConsultorio {
    const fusionar = <T>(nuevo: T | undefined, actual: T): T =>
      nuevo !== undefined ? nuevo : actual;

    const datos: DatosConfiguracion = {
      turnoDuracionMinutos: cambios.turnoDuracionMinutos ?? this.props.turnoDuracionMinutos,
      turnoPasoMinutos: cambios.turnoPasoMinutos ?? this.props.turnoPasoMinutos,
      atencionHoraDesde: fusionar(cambios.atencionHoraDesde, this.props.atencionHoraDesde),
      atencionHoraHasta: fusionar(cambios.atencionHoraHasta, this.props.atencionHoraHasta),
      diasAtencion: cambios.diasAtencion ?? this.props.diasAtencion,
      nombreProfesional: fusionar(cambios.nombreProfesional, this.props.nombreProfesional),
      matricula: fusionar(cambios.matricula, this.props.matricula),
      logoArchivoId: fusionar(cambios.logoArchivoId, this.props.logoArchivoId),
      pdfColorPrimario: fusionar(cambios.pdfColorPrimario, this.props.pdfColorPrimario),
      pdfSubtitulo: fusionar(cambios.pdfSubtitulo, this.props.pdfSubtitulo),
      pdfPieTexto: fusionar(cambios.pdfPieTexto, this.props.pdfPieTexto),
      pdfMostrarRecetas: fusionar(cambios.pdfMostrarRecetas, this.props.pdfMostrarRecetas),
      pdfMostrarMacros: fusionar(cambios.pdfMostrarMacros, this.props.pdfMostrarMacros),
      pdfMostrarEquivalencias: fusionar(
        cambios.pdfMostrarEquivalencias,
        this.props.pdfMostrarEquivalencias,
      ),
      pdfMostrarRecomendaciones: fusionar(
        cambios.pdfMostrarRecomendaciones,
        this.props.pdfMostrarRecomendaciones,
      ),
    };
    validar(datos);
    return new ConfiguracionConsultorio({ ...this.props, ...datos, actualizadoEn: ahora });
  }

  get id(): string {
    return this.props.id;
  }

  aPrimitivos(): PropiedadesConfiguracion {
    return { ...this.props, diasAtencion: [...this.props.diasAtencion] };
  }
}

function validar(d: DatosConfiguracion): void {
  const rangoMinutos = (v: number): boolean => Number.isInteger(v) && v >= 5 && v <= 480;
  if (!rangoMinutos(d.turnoDuracionMinutos)) {
    throw new ErrorValidacion("La duración de turno debe estar entre 5 y 480 minutos.");
  }
  if (!rangoMinutos(d.turnoPasoMinutos)) {
    throw new ErrorValidacion("El paso de la agenda debe estar entre 5 y 480 minutos.");
  }
  if (d.atencionHoraDesde != null && !PATRON_HORA.test(d.atencionHoraDesde)) {
    throw new ErrorValidacion("La hora de atención (desde) debe tener formato HH:mm.");
  }
  if (d.atencionHoraHasta != null && !PATRON_HORA.test(d.atencionHoraHasta)) {
    throw new ErrorValidacion("La hora de atención (hasta) debe tener formato HH:mm.");
  }
  if (d.atencionHoraDesde && d.atencionHoraHasta && d.atencionHoraHasta <= d.atencionHoraDesde) {
    throw new ErrorValidacion("El horario de atención está invertido.");
  }
  if (d.diasAtencion.some((n) => !Number.isInteger(n) || n < 0 || n > 6)) {
    throw new ErrorValidacion("Los días de atención deben ser números entre 0 y 6.");
  }
  if (d.pdfColorPrimario != null && !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(d.pdfColorPrimario)) {
    throw new ErrorValidacion("El color del PDF debe ser un hexadecimal, ej. #F4535E.");
  }
}
