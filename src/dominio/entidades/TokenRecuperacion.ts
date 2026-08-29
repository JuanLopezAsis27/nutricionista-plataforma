import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Datos para emitir un token de recuperación de contraseña. */
export interface DatosNuevoToken {
  usuarioId: string;
  /** Hash del token (nunca se guarda el token en claro). */
  tokenHash: string;
  expiraEn: Date;
}

/** Estado completo de un token de recuperación persistido. */
export interface PropiedadesTokenRecuperacion {
  id: string;
  usuarioId: string;
  tokenHash: string;
  expiraEn: Date;
  usadoEn: Date | null;
  creadoEn: Date;
}

/**
 * Entidad de dominio TokenRecuperacion.
 *
 * Representa un token de un solo uso para restablecer la contraseña. Solo se
 * guarda el HASH del token (SHA-256): quien tenga acceso a la base no puede
 * reconstruir el token en claro que llegó al email del usuario. El token es
 * válido hasta `expiraEn` y mientras no haya sido usado (`usadoEn == null`).
 */
export class TokenRecuperacion {
  private constructor(private readonly props: PropiedadesTokenRecuperacion) {}

  static crear(
    datos: DatosNuevoToken,
    id: string,
    ahora: Date = new Date(),
  ): TokenRecuperacion {
    if (!datos.usuarioId) {
      throw new ErrorValidacion("El token debe pertenecer a un usuario.");
    }
    if (!datos.tokenHash) {
      throw new ErrorValidacion("El token debe tener un hash.");
    }
    if (datos.expiraEn.getTime() <= ahora.getTime()) {
      throw new ErrorValidacion("La expiración del token debe ser futura.");
    }
    return new TokenRecuperacion({
      id,
      usuarioId: datos.usuarioId,
      tokenHash: datos.tokenHash,
      expiraEn: datos.expiraEn,
      usadoEn: null,
      creadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesTokenRecuperacion): TokenRecuperacion {
    return new TokenRecuperacion(props);
  }

  /** Un token es utilizable si no fue usado y no venció. */
  estaVigente(ahora: Date = new Date()): boolean {
    return (
      this.props.usadoEn === null &&
      this.props.expiraEn.getTime() > ahora.getTime()
    );
  }

  get id(): string {
    return this.props.id;
  }
  get usuarioId(): string {
    return this.props.usuarioId;
  }
  get tokenHash(): string {
    return this.props.tokenHash;
  }
  get expiraEn(): Date {
    return this.props.expiraEn;
  }
  get usadoEn(): Date | null {
    return this.props.usadoEn;
  }
  get creadoEn(): Date {
    return this.props.creadoEn;
  }

  aPrimitivos(): PropiedadesTokenRecuperacion {
    return { ...this.props };
  }
}
