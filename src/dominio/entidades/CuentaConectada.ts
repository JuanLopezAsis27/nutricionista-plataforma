import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Proveedores de cuentas externas soportados. */
export const PROVEEDORES_CUENTA = ["GOOGLE"] as const;
export type ProveedorCuenta = (typeof PROVEEDORES_CUENTA)[number];

/** Datos para conectar (o reconectar) una cuenta externa. */
export interface DatosCuentaConectada {
  proveedor: ProveedorCuenta;
  emailCuenta: string;
  /** Tokens en CLARO; el repositorio los cifra al persistir. */
  accessToken: string;
  refreshToken: string | null;
  scopes: string[];
  expiraEn: Date | null;
}

/** Estado completo persistido (tokens en claro; el repo los descifra al leer). */
export interface PropiedadesCuentaConectada extends DatosCuentaConectada {
  id: string;
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Entidad de dominio CuentaConectada: la conexión OAuth de un nutricionista con
 * un proveedor externo (Google). Guarda los tokens para operar en su nombre
 * (calendario, envío de emails). El cifrado de los tokens es responsabilidad de
 * la infraestructura (el dominio trabaja con los tokens en claro).
 */
export class CuentaConectada {
  private constructor(private readonly props: PropiedadesCuentaConectada) {}

  static crear(
    datos: DatosCuentaConectada,
    id: string,
    ahora: Date = new Date(),
  ): CuentaConectada {
    if (!datos.emailCuenta?.trim()) {
      throw new ErrorValidacion("La cuenta conectada necesita un email.");
    }
    if (!datos.accessToken?.trim()) {
      throw new ErrorValidacion(
        "La cuenta conectada necesita un access token.",
      );
    }
    return new CuentaConectada({
      id,
      proveedor: datos.proveedor,
      emailCuenta: datos.emailCuenta.trim(),
      accessToken: datos.accessToken,
      refreshToken: datos.refreshToken,
      scopes: datos.scopes,
      expiraEn: datos.expiraEn,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesCuentaConectada): CuentaConectada {
    return new CuentaConectada(props);
  }

  /** Copia con el access token renovado (tras un refresh). */
  conAccessToken(
    accessToken: string,
    expiraEn: Date | null,
    ahora: Date = new Date(),
  ): CuentaConectada {
    return new CuentaConectada({
      ...this.props,
      accessToken,
      expiraEn,
      actualizadoEn: ahora,
    });
  }

  /** ¿El access token está vencido (o por vencer en `margenSegundos`)? */
  estaVencido(margenSegundos = 60, ahora: Date = new Date()): boolean {
    if (!this.props.expiraEn) return false;
    return (
      this.props.expiraEn.getTime() - ahora.getTime() <= margenSegundos * 1000
    );
  }

  get id(): string {
    return this.props.id;
  }
  get proveedor(): ProveedorCuenta {
    return this.props.proveedor;
  }
  get emailCuenta(): string {
    return this.props.emailCuenta;
  }
  get accessToken(): string {
    return this.props.accessToken;
  }
  get refreshToken(): string | null {
    return this.props.refreshToken;
  }

  aPrimitivos(): PropiedadesCuentaConectada {
    return { ...this.props, scopes: [...this.props.scopes] };
  }
}
