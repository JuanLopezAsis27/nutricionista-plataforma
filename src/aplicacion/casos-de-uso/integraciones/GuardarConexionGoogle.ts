import type { ICuentaConectadaRepositorio } from "@/dominio/repositorios/ICuentaConectadaRepositorio";
import type { TokensGoogle } from "@/dominio/servicios/IProveedorGoogle";
import { CuentaConectada } from "@/dominio/entidades/CuentaConectada";

/**
 * Caso de uso: guardar (o reemplazar) la conexión de Google del nutricionista a
 * partir de los tokens obtenidos en el callback OAuth.
 */
export class GuardarConexionGoogle {
  constructor(private readonly cuentas: ICuentaConectadaRepositorio) {}

  async ejecutar(tokens: TokensGoogle): Promise<CuentaConectada> {
    const cuenta = CuentaConectada.crear(
      {
        proveedor: "GOOGLE",
        emailCuenta: tokens.emailCuenta,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        scopes: tokens.scopes,
        expiraEn: tokens.expiraEn,
      },
      crypto.randomUUID(),
    );
    return this.cuentas.guardar(cuenta);
  }
}
