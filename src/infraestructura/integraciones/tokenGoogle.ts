import type { ICuentaConectadaRepositorio } from "@/dominio/repositorios/ICuentaConectadaRepositorio";
import type { IProveedorGoogle } from "@/dominio/servicios/IProveedorGoogle";
import type { CuentaConectada } from "@/dominio/entidades/CuentaConectada";

/**
 * Devuelve un access token válido de la cuenta: si está vencido y hay refresh
 * token, lo refresca y persiste el nuevo (cifrado). Si no, usa el actual.
 */
export async function obtenerAccessTokenValido(
  cuenta: CuentaConectada,
  cuentas: ICuentaConectadaRepositorio,
  proveedor: IProveedorGoogle,
): Promise<string> {
  if (cuenta.estaVencido() && cuenta.refreshToken) {
    const { accessToken, expiraEn } = await proveedor.refrescarAccessToken(
      cuenta.refreshToken,
    );
    await cuentas.guardar(cuenta.conAccessToken(accessToken, expiraEn));
    return accessToken;
  }
  return cuenta.accessToken;
}
