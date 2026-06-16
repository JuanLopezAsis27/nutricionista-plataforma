import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Roles de acceso al sistema. */
export const ROLES_USUARIO = ["NUTRICIONISTA", "PACIENTE"] as const;
export type RolUsuario = (typeof ROLES_USUARIO)[number];

/** Datos para crear un usuario nuevo (la contraseña ya viene hasheada). */
export interface DatosNuevoUsuario {
  email: string;
  passwordHash: string;
  rol: RolUsuario;
  pacienteId?: string | null;
}

/** Estado completo de un usuario persistido. */
export interface PropiedadesUsuario {
  id: string;
  email: string;
  passwordHash: string;
  rol: RolUsuario;
  pacienteId: string | null;
  creadoEn: Date;
}

const PATRON_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Entidad de dominio Usuario.
 *
 * Invariante de negocio clave: si el rol es PACIENTE debe tener un
 * pacienteId asociado; si es NUTRICIONISTA no debe tenerlo. El hasheo de la
 * contraseña ocurre fuera del dominio (infraestructura/bcrypt); acá solo se
 * almacena el hash, nunca la contraseña en texto plano.
 */
export class Usuario {
  private constructor(private readonly props: PropiedadesUsuario) {}

  static crear(datos: DatosNuevoUsuario, id: string, ahora: Date = new Date()): Usuario {
    const email = datos.email?.trim().toLowerCase() ?? "";
    if (!PATRON_EMAIL.test(email)) {
      throw new ErrorValidacion("El email del usuario no es válido.");
    }
    if (!datos.passwordHash || datos.passwordHash.length === 0) {
      throw new ErrorValidacion("El usuario debe tener una contraseña hasheada.");
    }
    Usuario.validarCoherenciaRol(datos.rol, datos.pacienteId ?? null);

    return new Usuario({
      id,
      email,
      passwordHash: datos.passwordHash,
      rol: datos.rol,
      pacienteId: datos.pacienteId ?? null,
      creadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesUsuario): Usuario {
    return new Usuario(props);
  }

  /** Devuelve una copia del usuario con el email cambiado (revalidado). */
  cambiarEmail(nuevoEmail: string): Usuario {
    const email = nuevoEmail?.trim().toLowerCase() ?? "";
    if (!PATRON_EMAIL.test(email)) {
      throw new ErrorValidacion("El email del usuario no es válido.");
    }
    return new Usuario({ ...this.props, email });
  }

  /** Garantiza que el rol y el pacienteId sean coherentes entre sí. */
  private static validarCoherenciaRol(rol: RolUsuario, pacienteId: string | null): void {
    if (rol === "PACIENTE" && !pacienteId) {
      throw new ErrorValidacion("Un usuario con rol PACIENTE debe tener un paciente asociado.");
    }
    if (rol === "NUTRICIONISTA" && pacienteId) {
      throw new ErrorValidacion("Un usuario NUTRICIONISTA no debe tener un paciente asociado.");
    }
  }

  get esNutricionista(): boolean {
    return this.props.rol === "NUTRICIONISTA";
  }

  get id(): string {
    return this.props.id;
  }
  get email(): string {
    return this.props.email;
  }
  get passwordHash(): string {
    return this.props.passwordHash;
  }
  get rol(): RolUsuario {
    return this.props.rol;
  }
  get pacienteId(): string | null {
    return this.props.pacienteId;
  }
  get creadoEn(): Date {
    return this.props.creadoEn;
  }

  aPrimitivos(): PropiedadesUsuario {
    return { ...this.props };
  }
}
