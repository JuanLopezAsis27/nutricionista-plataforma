import type { CuentaConectada, ProveedorCuenta } from "../entidades/CuentaConectada";

/**
 * Contrato de persistencia de las cuentas externas conectadas. Está acotado por
 * inquilino (la extensión multi-tenant filtra por nutricionista): `obtener`
 * devuelve la del nutricionista de la request; `guardar` hace upsert por
 * (nutricionista, proveedor) — reconectar reemplaza. Los tokens se guardan
 * cifrados y se devuelven en claro (el repositorio los descifra).
 */
export interface ICuentaConectadaRepositorio {
  obtener(proveedor: ProveedorCuenta): Promise<CuentaConectada | null>;
  guardar(cuenta: CuentaConectada): Promise<CuentaConectada>;
  eliminar(proveedor: ProveedorCuenta): Promise<void>;
}
