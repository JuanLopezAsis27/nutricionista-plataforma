import { ErrorValidacion } from "../errores/ErrorValidacion";

/**
 * Campos editables de la configuración del consultorio.
 *
 * La AGENDA (días, horario, duración y paso del turno) ya no está acá: se mudó
 * a `Establecimiento` en la migración 49, porque describe al LUGAR y no al
 * profesional. Con una sola lista de días para todo el consultorio no se podía
 * decir "lunes y miércoles en el centro, martes y jueves en el barrio".
 */
export interface DatosConfiguracion {
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
  // Recordatorio de turno por WhatsApp. El TEXTO no vive acá: son plantillas
  // propias (`PlantillaWhatsapp`), porque una de ellas tiene que corresponder
  // con la que Meta aprobó y eso es más que un campo de texto. Lo que queda es
  // lo que sí es del consultorio: cómo se canonizan los teléfonos.
  /** Prefijo internacional sin "+" para normalizar teléfonos locales, ej "54". */
  whatsappPrefijoPais: string | null;
}

/** Estado completo persistido. */
export interface PropiedadesConfiguracion extends DatosConfiguracion {
  id: string;
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Entidad de dominio ConfiguracionConsultorio: lo que describe al PROFESIONAL,
 * que es uno solo (una fila por inquilino). Membrete para PDF y emails,
 * apariencia del plan y prefijo telefónico.
 *
 * Lo que describe al LUGAR —días y horarios de atención, duración y paso del
 * turno— vive en `Establecimiento` desde la migración 49: un consultorio puede
 * tener varias sedes con agendas distintas y el membrete sigue siendo el mismo.
 *
 * Invariantes: color del PDF hexadecimal; prefijo de país solo dígitos.
 */
export class ConfiguracionConsultorio {
  private constructor(private readonly props: PropiedadesConfiguracion) {}

  /** Configuración por defecto (cuando todavía no se guardó ninguna). */
  static porDefecto(ahora: Date = new Date()): ConfiguracionConsultorio {
    return new ConfiguracionConsultorio({
      id: crypto.randomUUID(),
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
      whatsappPrefijoPais: null,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(
    props: PropiedadesConfiguracion,
  ): ConfiguracionConsultorio {
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
      nombreProfesional: fusionar(
        cambios.nombreProfesional,
        this.props.nombreProfesional,
      ),
      matricula: fusionar(cambios.matricula, this.props.matricula),
      logoArchivoId: fusionar(cambios.logoArchivoId, this.props.logoArchivoId),
      pdfColorPrimario: fusionar(
        cambios.pdfColorPrimario,
        this.props.pdfColorPrimario,
      ),
      pdfSubtitulo: fusionar(cambios.pdfSubtitulo, this.props.pdfSubtitulo),
      pdfPieTexto: fusionar(cambios.pdfPieTexto, this.props.pdfPieTexto),
      pdfMostrarRecetas: fusionar(
        cambios.pdfMostrarRecetas,
        this.props.pdfMostrarRecetas,
      ),
      pdfMostrarMacros: fusionar(
        cambios.pdfMostrarMacros,
        this.props.pdfMostrarMacros,
      ),
      pdfMostrarEquivalencias: fusionar(
        cambios.pdfMostrarEquivalencias,
        this.props.pdfMostrarEquivalencias,
      ),
      pdfMostrarRecomendaciones: fusionar(
        cambios.pdfMostrarRecomendaciones,
        this.props.pdfMostrarRecomendaciones,
      ),
      whatsappPrefijoPais: fusionar(
        cambios.whatsappPrefijoPais,
        this.props.whatsappPrefijoPais,
      ),
    };
    validar(datos);
    return new ConfiguracionConsultorio({
      ...this.props,
      ...datos,
      actualizadoEn: ahora,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get whatsappPrefijoPais(): string | null {
    return this.props.whatsappPrefijoPais;
  }

  aPrimitivos(): PropiedadesConfiguracion {
    return { ...this.props };
  }
}

function validar(d: DatosConfiguracion): void {
  if (
    d.pdfColorPrimario != null &&
    !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(d.pdfColorPrimario)
  ) {
    throw new ErrorValidacion(
      "El color del PDF debe ser un hexadecimal, ej. #F4535E.",
    );
  }
  if (
    d.whatsappPrefijoPais != null &&
    !/^\d{1,4}$/.test(d.whatsappPrefijoPais)
  ) {
    throw new ErrorValidacion(
      'El prefijo de país debe ser solo dígitos, sin "+" (ej. 54).',
    );
  }
}
