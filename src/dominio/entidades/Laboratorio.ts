import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Resumen de un archivo adjunto al laboratorio (lo completa el repositorio). */
export interface AdjuntoLaboratorio {
  id: string;
  nombreOriginal: string;
  mimeType: string;
  tamanoBytes: number;
}

/** Datos para registrar un laboratorio nuevo. */
export interface DatosNuevoLaboratorio {
  pacienteId: string;
  fecha: Date;
  titulo: string;
  notas?: string | null;
}

/** Estado completo de un laboratorio persistido. */
export interface PropiedadesLaboratorio {
  id: string;
  pacienteId: string;
  fecha: Date;
  titulo: string;
  notas: string | null;
  adjuntos: AdjuntoLaboratorio[];
  creadoEn: Date;
}

/**
 * Entidad de dominio Laboratorio: un estudio con fecha, título y adjuntos
 * (los PDF/imágenes viven en el bucket; acá solo su resumen).
 *
 * Invariantes: título obligatorio y fecha no futura.
 */
export class Laboratorio {
  private constructor(private readonly props: PropiedadesLaboratorio) {}

  static crear(
    datos: DatosNuevoLaboratorio,
    id: string,
    ahora: Date = new Date(),
  ): Laboratorio {
    if (!datos.pacienteId?.trim()) {
      throw new ErrorValidacion("El laboratorio debe pertenecer a un paciente.");
    }
    const titulo = datos.titulo?.trim() ?? "";
    if (titulo.length === 0) {
      throw new ErrorValidacion("El laboratorio debe tener un título.");
    }
    validarFecha(datos.fecha, ahora);

    return new Laboratorio({
      id,
      pacienteId: datos.pacienteId,
      fecha: datos.fecha,
      titulo,
      notas: datos.notas?.trim() || null,
      adjuntos: [],
      creadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesLaboratorio): Laboratorio {
    return new Laboratorio(props);
  }

  /** Versión actualizada e inmutable (preserva id, paciente, adjuntos y creadoEn). */
  actualizar(
    cambios: Partial<Omit<DatosNuevoLaboratorio, "pacienteId">>,
    ahora: Date = new Date(),
  ): Laboratorio {
    const actualizado = Laboratorio.crear(
      {
        pacienteId: this.props.pacienteId,
        fecha: cambios.fecha ?? this.props.fecha,
        titulo: cambios.titulo ?? this.props.titulo,
        notas: cambios.notas !== undefined ? cambios.notas : this.props.notas,
      },
      this.props.id,
      ahora,
    );
    return new Laboratorio({
      ...actualizado.props,
      adjuntos: this.props.adjuntos.map((a) => ({ ...a })),
      creadoEn: this.props.creadoEn,
    });
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
  get titulo(): string {
    return this.props.titulo;
  }
  get notas(): string | null {
    return this.props.notas;
  }
  get adjuntos(): ReadonlyArray<AdjuntoLaboratorio> {
    return this.props.adjuntos;
  }
  get creadoEn(): Date {
    return this.props.creadoEn;
  }

  aPrimitivos(): PropiedadesLaboratorio {
    return { ...this.props, adjuntos: this.props.adjuntos.map((a) => ({ ...a })) };
  }
}

function validarFecha(fecha: Date, ahora: Date): void {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
    throw new ErrorValidacion("La fecha del laboratorio no es válida.");
  }
  const hoy = Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate());
  const dia = Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate());
  if (dia > hoy) {
    throw new ErrorValidacion("La fecha del laboratorio no puede ser futura.");
  }
}
