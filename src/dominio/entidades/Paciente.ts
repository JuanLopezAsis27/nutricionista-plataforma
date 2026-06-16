import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Datos necesarios para dar de alta un paciente nuevo. */
export interface DatosNuevoPaciente {
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string | null;
  fechaNacimiento?: Date | null;
  notas?: string | null;
}

/** Estado completo de un paciente ya persistido. */
export interface PropiedadesPaciente {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  fechaNacimiento: Date | null;
  notas: string | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

const PATRON_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Entidad de dominio Paciente.
 *
 * Encapsula las reglas de negocio propias de un paciente. La unicidad del
 * email (que requiere consultar el almacén) NO se valida acá: es
 * responsabilidad del caso de uso junto al repositorio. Acá solo viven los
 * invariantes que pueden comprobarse con los datos de la propia entidad.
 */
export class Paciente {
  private constructor(private readonly props: PropiedadesPaciente) {}

  /** Crea un paciente nuevo validando todos sus invariantes. */
  static crear(datos: DatosNuevoPaciente, id: string, ahora: Date = new Date()): Paciente {
    const nombre = datos.nombre?.trim() ?? "";
    const apellido = datos.apellido?.trim() ?? "";
    const email = datos.email?.trim().toLowerCase() ?? "";

    if (nombre.length === 0) {
      throw new ErrorValidacion("El nombre del paciente es obligatorio.");
    }
    if (apellido.length === 0) {
      throw new ErrorValidacion("El apellido del paciente es obligatorio.");
    }
    if (!PATRON_EMAIL.test(email)) {
      throw new ErrorValidacion("El email del paciente no es válido.");
    }
    if (datos.fechaNacimiento && datos.fechaNacimiento.getTime() > ahora.getTime()) {
      throw new ErrorValidacion("La fecha de nacimiento no puede ser futura.");
    }

    return new Paciente({
      id,
      nombre,
      apellido,
      email,
      telefono: datos.telefono?.trim() || null,
      fechaNacimiento: datos.fechaNacimiento ?? null,
      notas: datos.notas?.trim() || null,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  /** Reconstruye un paciente desde la persistencia (se asume ya válido). */
  static reconstruir(props: PropiedadesPaciente): Paciente {
    return new Paciente(props);
  }

  /**
   * Devuelve una copia del paciente con los cambios aplicados y revalidados.
   * Preserva id y creadoEn; actualiza actualizadoEn. No muta la instancia
   * original (las entidades se tratan como inmutables hacia afuera).
   */
  actualizar(cambios: Partial<DatosNuevoPaciente>, ahora: Date = new Date()): Paciente {
    const datos: DatosNuevoPaciente = {
      nombre: cambios.nombre ?? this.props.nombre,
      apellido: cambios.apellido ?? this.props.apellido,
      email: cambios.email ?? this.props.email,
      telefono: cambios.telefono !== undefined ? cambios.telefono : this.props.telefono,
      fechaNacimiento:
        cambios.fechaNacimiento !== undefined
          ? cambios.fechaNacimiento
          : this.props.fechaNacimiento,
      notas: cambios.notas !== undefined ? cambios.notas : this.props.notas,
    };

    // Reutiliza la validación de `crear` y luego preserva el creadoEn original.
    const validado = Paciente.crear(datos, this.props.id, ahora);
    return Paciente.reconstruir({
      ...validado.aPrimitivos(),
      creadoEn: this.props.creadoEn,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get nombre(): string {
    return this.props.nombre;
  }
  get apellido(): string {
    return this.props.apellido;
  }
  get nombreCompleto(): string {
    return `${this.props.nombre} ${this.props.apellido}`;
  }
  get email(): string {
    return this.props.email;
  }
  get telefono(): string | null {
    return this.props.telefono ?? null;
  }
  get fechaNacimiento(): Date | null {
    return this.props.fechaNacimiento ?? null;
  }
  get notas(): string | null {
    return this.props.notas ?? null;
  }
  get creadoEn(): Date {
    return this.props.creadoEn;
  }
  get actualizadoEn(): Date {
    return this.props.actualizadoEn;
  }

  /** Devuelve una copia plana, útil para mapear a DTOs o a la persistencia. */
  aPrimitivos(): PropiedadesPaciente {
    return { ...this.props };
  }
}
