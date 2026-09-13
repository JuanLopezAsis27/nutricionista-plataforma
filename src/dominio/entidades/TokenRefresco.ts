import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Datos para emitir un token de refresco. */
export interface DatosNuevoTokenRefresco {
  usuarioId: string;
  /** Cadena de rotación a la que pertenece (ver la clase). */
  familia: string;
  /** Hash del token (nunca se guarda el token en claro). */
  tokenHash: string;
  expiraEn: Date;
  /** User-Agent recortado del dispositivo, para reconocer la sesión. */
  dispositivo: string | null;
}

/** Estado completo de un token de refresco persistido. */
export interface PropiedadesTokenRefresco {
  id: string;
  usuarioId: string;
  familia: string;
  tokenHash: string;
  expiraEn: Date;
  usadoEn: Date | null;
  revocadoEn: Date | null;
  dispositivo: string | null;
  creadoEn: Date;
}

/**
 * Entidad de dominio TokenRefresco.
 *
 * Es la credencial que permite emitir una sesión nueva sin volver a pedir la
 * contraseña. Como el de recuperación, solo se guarda su HASH: quien acceda a
 * la base no puede reconstruir el token que vive en la cookie del navegador.
 *
 * ## Por qué rota y por qué tiene familia
 *
 * Un token de refresco vive semanas, así que es un objetivo mucho más goloso
 * que una sesión de 12 h. La defensa es la ROTACIÓN: cada canje lo consume y
 * emite uno nuevo, de modo que un token robado sirve una sola vez.
 *
 * Pero la rotación sola no alcanza para DETECTAR el robo: si el ladrón canjea
 * primero, la víctima llega después con un token ya usado y no hay forma de
 * saber cuál de los dos era el legítimo. Por eso todos los tokens que
 * descienden de un mismo login comparten una `familia`: cuando aparece uno ya
 * consumido, se revoca la familia entera. Cualquiera de los dos que sea el
 * ladrón, los dos quedan afuera y el dueño vuelve a entrar con su contraseña.
 * Sin la familia habría que elegir a quién creerle, y esa apuesta se pierde la
 * mitad de las veces.
 */
export class TokenRefresco {
  private constructor(private readonly props: PropiedadesTokenRefresco) {}

  static crear(
    datos: DatosNuevoTokenRefresco,
    id: string,
    ahora: Date = new Date(),
  ): TokenRefresco {
    if (!datos.usuarioId) {
      throw new ErrorValidacion("El token debe pertenecer a un usuario.");
    }
    if (!datos.familia) {
      throw new ErrorValidacion("El token debe pertenecer a una familia.");
    }
    if (!datos.tokenHash) {
      throw new ErrorValidacion("El token debe tener un hash.");
    }
    if (datos.expiraEn.getTime() <= ahora.getTime()) {
      throw new ErrorValidacion("La expiración del token debe ser futura.");
    }
    return new TokenRefresco({
      id,
      usuarioId: datos.usuarioId,
      familia: datos.familia,
      tokenHash: datos.tokenHash,
      expiraEn: datos.expiraEn,
      usadoEn: null,
      revocadoEn: null,
      dispositivo: datos.dispositivo,
      creadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesTokenRefresco): TokenRefresco {
    return new TokenRefresco(props);
  }

  /** Canjeable: no se usó, no se revocó y no venció. */
  estaVigente(ahora: Date = new Date()): boolean {
    return (
      this.props.usadoEn === null &&
      this.props.revocadoEn === null &&
      this.props.expiraEn.getTime() > ahora.getTime()
    );
  }

  /**
   * ¿Presentaron un token que ya se había canjeado?
   *
   * Es la señal de robo: el legítimo ya lo cambió por otro, así que quien trae
   * este lo tenía copiado. Se distingue de "venció" a propósito —el vencido no
   * dice nada de nadie, este obliga a matar la familia entera.
   */
  fueReutilizado(): boolean {
    return this.props.usadoEn !== null;
  }

  get id(): string {
    return this.props.id;
  }
  get usuarioId(): string {
    return this.props.usuarioId;
  }
  get familia(): string {
    return this.props.familia;
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
  get revocadoEn(): Date | null {
    return this.props.revocadoEn;
  }
  get dispositivo(): string | null {
    return this.props.dispositivo;
  }
  get creadoEn(): Date {
    return this.props.creadoEn;
  }

  aPrimitivos(): PropiedadesTokenRefresco {
    return { ...this.props };
  }
}
