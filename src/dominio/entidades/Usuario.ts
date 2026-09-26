import { ErrorValidacion } from "../errores/ErrorValidacion";
import {
  esNombreUsuarioValido,
  normalizarNombreUsuario,
  REGLA_NOMBRE_USUARIO,
} from "../servicios/nombreUsuario";

/** Roles de acceso al sistema. */
export const ROLES_USUARIO = [
  "SUPERADMIN",
  "NUTRICIONISTA",
  "PACIENTE",
] as const;
export type RolUsuario = (typeof ROLES_USUARIO)[number];

/** Datos para crear un usuario nuevo (la contraseña ya viene hasheada). */
export interface DatosNuevoUsuario {
  /** Obligatorio salvo para un PACIENTE que entra con `nombreUsuario`. */
  email?: string | null;
  /** Credencial alternativa al email (migración 80); ver `nombreUsuario.ts`. */
  nombreUsuario?: string | null;
  passwordHash: string;
  rol: RolUsuario;
  /**
   * Inquilino (tenant): el NUTRICIONISTA es su propio inquilino (= su id); el
   * SUPERADMIN y el PACIENTE son globales (null). Los consultorios de un
   * paciente son los de sus fichas (`pacientes.usuarioId`), no su cuenta.
   */
  nutricionistaId?: string | null;
  activo?: boolean;
  /** La contraseña la eligió un profesional y no la persona (ver la clase). */
  passwordProvisional?: boolean;
}

/** Estado completo de un usuario persistido. */
export interface PropiedadesUsuario {
  id: string;
  email: string | null;
  nombreUsuario: string | null;
  passwordHash: string;
  rol: RolUsuario;
  nutricionistaId: string | null;
  activo: boolean;
  passwordProvisional: boolean;
  /** Archivo del bucket que se muestra como foto de perfil; null si no eligió. */
  fotoPerfilId: string | null;
  creadoEn: Date;
}

const PATRON_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Entidad de dominio Usuario.
 *
 * Es la CUENTA: con qué se entra (email, nombre de usuario o los dos),
 * contraseña, rol y foto. Solo un PACIENTE puede no tener email (migración 80). La de un PACIENTE no pertenece
 * a ningún consultorio (`nutricionistaId` null): la misma persona puede ser
 * paciente de varios, y sus fichas son las que apuntan a ella (`usuarioId`)
 * (migración 78). El hasheo de la contraseña ocurre fuera del dominio
 * (infraestructura/bcrypt); acá solo se almacena el hash.
 *
 * **Contraseña provisional.** Cuando la contraseña la eligió un profesional
 * —en el alta o en la bienvenida manual— la persona no la conoce por elección
 * propia y el profesional sí. Se marca, y el portal le recomienda cambiarla.
 * No obliga: la defensa real es que un profesional solo puede fijarla en una
 * cuenta EXCLUSIVA de su consultorio (ver `cuentaPaciente.ts`).
 */
export class Usuario {
  private constructor(private readonly props: PropiedadesUsuario) {}

  static crear(
    datos: DatosNuevoUsuario,
    id: string,
    ahora: Date = new Date(),
  ): Usuario {
    const email = Usuario.validarEmail(datos.email);
    const nombreUsuario = Usuario.validarNombreUsuario(datos.nombreUsuario);
    if (!email && !nombreUsuario) {
      throw new ErrorValidacion(
        "La cuenta necesita un email o un nombre de usuario para poder entrar.",
      );
    }
    if (!email && datos.rol !== "PACIENTE") {
      throw new ErrorValidacion("El email del usuario no es válido.");
    }
    if (!datos.passwordHash || datos.passwordHash.length === 0) {
      throw new ErrorValidacion(
        "El usuario debe tener una contraseña hasheada.",
      );
    }
    Usuario.validarCoherenciaRol(datos.rol, datos.nutricionistaId ?? null);

    return new Usuario({
      id,
      email,
      nombreUsuario,
      passwordHash: datos.passwordHash,
      rol: datos.rol,
      nutricionistaId: datos.nutricionistaId ?? null,
      activo: datos.activo ?? true,
      passwordProvisional: datos.passwordProvisional ?? false,
      fotoPerfilId: null,
      creadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesUsuario): Usuario {
    return new Usuario(props);
  }

  /** Devuelve una copia del usuario con el email cambiado (revalidado). */
  cambiarEmail(nuevoEmail: string): Usuario {
    const email = Usuario.validarEmail(nuevoEmail);
    if (!email) {
      throw new ErrorValidacion("El email del usuario no es válido.");
    }
    return new Usuario({ ...this.props, email });
  }

  /**
   * Devuelve una copia con otras credenciales de ingreso (migración 80). Las
   * mismas reglas que al crearla: al menos una de las dos, y solo un PACIENTE
   * puede quedarse sin email. Que no las use otra cuenta lo verifica quien
   * llama, contra el repositorio.
   */
  cambiarIngreso(email: string | null, nombreUsuario: string | null): Usuario {
    const nuevoEmail = Usuario.validarEmail(email);
    const nuevoUsuario = Usuario.validarNombreUsuario(nombreUsuario);
    if (!nuevoEmail && !nuevoUsuario) {
      throw new ErrorValidacion(
        "La cuenta necesita un email o un nombre de usuario para poder entrar.",
      );
    }
    if (!nuevoEmail && this.props.rol !== "PACIENTE") {
      throw new ErrorValidacion(
        "La cuenta de un profesional necesita un email.",
      );
    }
    return new Usuario({
      ...this.props,
      email: nuevoEmail,
      nombreUsuario: nuevoUsuario,
    });
  }

  /** Email vacío o nulo → null; con contenido, tiene que tener forma de email. */
  private static validarEmail(valor: string | null | undefined): string | null {
    const email = valor?.trim().toLowerCase() || null;
    if (email !== null && !PATRON_EMAIL.test(email)) {
      throw new ErrorValidacion("El email del usuario no es válido.");
    }
    return email;
  }

  private static validarNombreUsuario(
    valor: string | null | undefined,
  ): string | null {
    const nombre = valor ? normalizarNombreUsuario(valor) : "";
    if (!nombre) return null;
    if (!esNombreUsuarioValido(nombre)) {
      throw new ErrorValidacion(
        `El nombre de usuario no es válido. ${REGLA_NOMBRE_USUARIO}`,
      );
    }
    return nombre;
  }

  /** Devuelve una copia del usuario activado/desactivado. */
  cambiarActivo(activo: boolean): Usuario {
    return new Usuario({ ...this.props, activo });
  }

  /**
   * Devuelve una copia del usuario con una contraseña nueva (ya hasheada) que
   * eligió LA PERSONA: deja de ser provisional. El hasheo ocurre en
   * infraestructura; acá solo se guarda el hash, nunca la contraseña en texto
   * plano.
   */
  cambiarPassword(nuevoHash: string): Usuario {
    Usuario.validarHash(nuevoHash);
    return new Usuario({
      ...this.props,
      passwordHash: nuevoHash,
      passwordProvisional: false,
    });
  }

  /**
   * Contraseña que eligió un PROFESIONAL (la bienvenida manual): queda
   * marcada como provisional hasta que la persona la cambie.
   */
  fijarPasswordProvisional(nuevoHash: string): Usuario {
    Usuario.validarHash(nuevoHash);
    return new Usuario({
      ...this.props,
      passwordHash: nuevoHash,
      passwordProvisional: true,
    });
  }

  /**
   * El mismo hash con un costo de bcrypt más alto (re-hasheo del login): la
   * contraseña es la misma, así que la marca de provisional no cambia.
   */
  rehashearPassword(nuevoHash: string): Usuario {
    Usuario.validarHash(nuevoHash);
    return new Usuario({ ...this.props, passwordHash: nuevoHash });
  }

  private static validarHash(hash: string): void {
    if (!hash || hash.length === 0) {
      throw new ErrorValidacion(
        "El usuario debe tener una contraseña hasheada.",
      );
    }
  }

  /**
   * Devuelve una copia con otra foto de perfil (o sin ninguna, con `null`).
   *
   * El archivo ya está subido cuando se llama: acá solo se guarda a cuál
   * apunta la cuenta. Que exista y sea una imagen es asunto de `Archivo`, que
   * lo valida contra la lista blanca de su contexto.
   */
  cambiarFotoPerfil(archivoId: string | null): Usuario {
    return new Usuario({ ...this.props, fotoPerfilId: archivoId ?? null });
  }

  /**
   * La cuenta de un PACIENTE no es de ningún consultorio: si lo fuera, la
   * extensión de inquilino la escondería de todos los demás, y la persona no
   * podría entrar a su segundo consultorio con el mismo email.
   */
  private static validarCoherenciaRol(
    rol: RolUsuario,
    nutricionistaId: string | null,
  ): void {
    if (rol === "PACIENTE" && nutricionistaId) {
      throw new ErrorValidacion(
        "La cuenta de un paciente no pertenece a un consultorio: sus consultorios son los de sus fichas.",
      );
    }
  }

  get esNutricionista(): boolean {
    return this.props.rol === "NUTRICIONISTA";
  }
  get esSuperAdmin(): boolean {
    return this.props.rol === "SUPERADMIN";
  }
  get nutricionistaId(): string | null {
    return this.props.nutricionistaId;
  }
  get activo(): boolean {
    return this.props.activo;
  }
  get esPaciente(): boolean {
    return this.props.rol === "PACIENTE";
  }
  get passwordProvisional(): boolean {
    return this.props.passwordProvisional;
  }

  get id(): string {
    return this.props.id;
  }
  get email(): string | null {
    return this.props.email;
  }
  get nombreUsuario(): string | null {
    return this.props.nombreUsuario;
  }
  /**
   * Con qué entra, para mostrarlo: el email si tiene, si no el usuario. Uno de
   * los dos siempre existe (lo exige `crear` y un CHECK de la base).
   */
  get identificador(): string {
    return (this.props.email ?? this.props.nombreUsuario)!;
  }
  get passwordHash(): string {
    return this.props.passwordHash;
  }
  get rol(): RolUsuario {
    return this.props.rol;
  }
  get fotoPerfilId(): string | null {
    return this.props.fotoPerfilId;
  }
  get creadoEn(): Date {
    return this.props.creadoEn;
  }

  aPrimitivos(): PropiedadesUsuario {
    return { ...this.props };
  }
}
