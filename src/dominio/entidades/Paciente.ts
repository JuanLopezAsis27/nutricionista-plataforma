import { ErrorValidacion } from "../errores/ErrorValidacion";
import { normalizarTelefonoE164, PREFIJO_PAIS_POR_DEFECTO } from "../servicios/telefono";

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
  /**
   * Forma canónica del teléfono (E.164 sin "+"), derivada de `telefono`.
   * No se carga a mano: la calcula la entidad. Es lo que permite resolver por
   * índice al paciente que escribe por WhatsApp, en vez de traer la tabla
   * entera y normalizar en memoria.
   */
  telefonoE164: string | null;
  fechaNacimiento: Date | null;
  notas: string | null;
  /** Baja lógica: null = paciente vigente. */
  archivadoEn: Date | null;
  motivoArchivado: string | null;
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
  static crear(
    datos: DatosNuevoPaciente,
    id: string,
    ahora: Date = new Date(),
    prefijoPais: string = PREFIJO_PAIS_POR_DEFECTO,
  ): Paciente {
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

    const telefono = datos.telefono?.trim() || null;
    return new Paciente({
      id,
      nombre,
      apellido,
      email,
      telefono,
      telefonoE164: Paciente.canonizarTelefono(telefono, prefijoPais),
      fechaNacimiento: datos.fechaNacimiento ?? null,
      notas: datos.notas?.trim() || null,
      archivadoEn: null,
      motivoArchivado: null,
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
  actualizar(
    cambios: Partial<DatosNuevoPaciente>,
    ahora: Date = new Date(),
    prefijoPais: string = PREFIJO_PAIS_POR_DEFECTO,
  ): Paciente {
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

    // Reutiliza la validación de `crear` y luego preserva lo que no se edita.
    const validado = Paciente.crear(datos, this.props.id, ahora, prefijoPais);
    return Paciente.reconstruir({
      ...validado.aPrimitivos(),
      creadoEn: this.props.creadoEn,
      archivadoEn: this.props.archivadoEn,
      motivoArchivado: this.props.motivoArchivado,
    });
  }

  /**
   * Da de baja al paciente sin borrarlo: deja de contar como vigente en los
   * listados y en las estadísticas, pero conserva toda su historia clínica.
   */
  archivar(motivo: string | null = null, ahora: Date = new Date()): Paciente {
    if (this.props.archivadoEn) {
      throw new ErrorValidacion("El paciente ya está archivado.");
    }
    return Paciente.reconstruir({
      ...this.props,
      archivadoEn: ahora,
      motivoArchivado: motivo?.trim() || null,
      actualizadoEn: ahora,
    });
  }

  /** Vuelve a poner en seguimiento a un paciente archivado. */
  reactivar(ahora: Date = new Date()): Paciente {
    if (!this.props.archivadoEn) {
      throw new ErrorValidacion("El paciente no está archivado.");
    }
    return Paciente.reconstruir({
      ...this.props,
      archivadoEn: null,
      motivoArchivado: null,
      actualizadoEn: ahora,
    });
  }

  /**
   * Canoniza el teléfono a E.164. Un número ilegible NO invalida al paciente:
   * simplemente queda sin forma canónica y no se lo puede resolver por
   * WhatsApp. Bloquear el alta por un teléfono mal escrito sería peor.
   */
  private static canonizarTelefono(
    telefono: string | null,
    prefijoPais: string,
  ): string | null {
    if (!telefono) return null;
    try {
      return normalizarTelefonoE164(telefono, prefijoPais);
    } catch {
      return null;
    }
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
  get telefonoE164(): string | null {
    return this.props.telefonoE164 ?? null;
  }
  get archivadoEn(): Date | null {
    return this.props.archivadoEn ?? null;
  }
  get estaArchivado(): boolean {
    return this.props.archivadoEn != null;
  }
  get motivoArchivado(): string | null {
    return this.props.motivoArchivado ?? null;
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
