import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Datos para indicar (o editar) un suplemento. */
export interface DatosNuevoSuplemento {
  pacienteId: string;
  nombre: string;
  dosis?: string | null;
  frecuencia?: string | null;
  desde?: Date | null;
  hasta?: Date | null;
  activo?: boolean;
  notas?: string | null;
}

/** Estado completo de un suplemento persistido. */
export interface PropiedadesSuplemento {
  id: string;
  pacienteId: string;
  nombre: string;
  dosis: string | null;
  frecuencia: string | null;
  desde: Date | null;
  hasta: Date | null;
  activo: boolean;
  notas: string | null;
  creadoEn: Date;
}

/**
 * Entidad de dominio Suplemento: indicación de suplementación de un paciente
 * (creatina, omega 3…) con dosis, frecuencia y vigencia.
 *
 * Invariantes: paciente y nombre obligatorios; `hasta` nunca anterior a `desde`.
 */
export class Suplemento {
  private constructor(private readonly props: PropiedadesSuplemento) {}

  static crear(
    datos: DatosNuevoSuplemento,
    id: string,
    ahora: Date = new Date(),
  ): Suplemento {
    if (!datos.pacienteId?.trim()) {
      throw new ErrorValidacion("El suplemento debe pertenecer a un paciente.");
    }
    const nombre = datos.nombre?.trim() ?? "";
    if (nombre.length === 0) {
      throw new ErrorValidacion("El suplemento debe tener un nombre.");
    }
    if (datos.desde && datos.hasta && datos.hasta < datos.desde) {
      throw new ErrorValidacion(
        "La fecha de fin no puede ser anterior a la de inicio.",
      );
    }

    return new Suplemento({
      id,
      pacienteId: datos.pacienteId,
      nombre,
      dosis: datos.dosis?.trim() || null,
      frecuencia: datos.frecuencia?.trim() || null,
      desde: datos.desde ?? null,
      hasta: datos.hasta ?? null,
      activo: datos.activo ?? true,
      notas: datos.notas?.trim() || null,
      creadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesSuplemento): Suplemento {
    return new Suplemento(props);
  }

  /** Versión actualizada e inmutable (preserva id, paciente y creadoEn). */
  actualizar(cambios: Omit<DatosNuevoSuplemento, "pacienteId">): Suplemento {
    const actualizado = Suplemento.crear(
      { ...cambios, pacienteId: this.props.pacienteId },
      this.props.id,
    );
    return new Suplemento({
      ...actualizado.props,
      creadoEn: this.props.creadoEn,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get pacienteId(): string {
    return this.props.pacienteId;
  }
  get nombre(): string {
    return this.props.nombre;
  }
  get activo(): boolean {
    return this.props.activo;
  }

  aPrimitivos(): PropiedadesSuplemento {
    return { ...this.props };
  }
}
