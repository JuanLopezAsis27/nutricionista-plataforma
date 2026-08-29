import type {
  PrismaClient,
  CuentaConectada as CuentaFila,
} from "@prisma/client";
import type { ICuentaConectadaRepositorio } from "@/dominio/repositorios/ICuentaConectadaRepositorio";
import {
  CuentaConectada,
  type ProveedorCuenta,
} from "@/dominio/entidades/CuentaConectada";
import type { CifradorTokens } from "@/infraestructura/seguridad/CifradorTokens";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/**
 * Implementación con Prisma del repositorio de cuentas externas conectadas.
 * Cifra los tokens al persistir y los descifra al leer (AES-256-GCM). La
 * extensión multi-tenant acota todo al nutricionista de la request.
 */
export class PrismaRepositorioCuentaConectada implements ICuentaConectadaRepositorio {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cifrador: CifradorTokens,
  ) {}

  async obtener(proveedor: ProveedorCuenta): Promise<CuentaConectada | null> {
    const fila = await this.prisma.cuentaConectada.findFirst({ where: { proveedor } });
    return fila ? this.mapear(fila) : null;
  }

  async guardar(cuenta: CuentaConectada): Promise<CuentaConectada> {
    const d = cuenta.aPrimitivos();
    const datos = {
      proveedor: d.proveedor,
      emailCuenta: d.emailCuenta,
      accessTokenCifrado: this.cifrador.cifrar(d.accessToken),
      refreshTokenCifrado: d.refreshToken ? this.cifrador.cifrar(d.refreshToken) : null,
      scopes: d.scopes,
      expiraEn: d.expiraEn,
    };
    // Una cuenta por (nutricionista, proveedor): si existe se actualiza, si no se crea.
    const existente = await this.prisma.cuentaConectada.findFirst({
      where: { proveedor: d.proveedor },
    });
    const fila = existente
      ? await this.prisma.cuentaConectada.update({ where: { id: existente.id }, data: datos })
      : await this.prisma.cuentaConectada.create({ data: { id: d.id, nutricionistaId: inquilinoActual(), ...datos } });
    return this.mapear(fila);
  }

  async eliminar(proveedor: ProveedorCuenta): Promise<void> {
    await this.prisma.cuentaConectada.deleteMany({ where: { proveedor } });
  }

  private mapear(fila: CuentaFila): CuentaConectada {
    return CuentaConectada.reconstruir({
      id: fila.id,
      proveedor: fila.proveedor,
      emailCuenta: fila.emailCuenta,
      accessToken: this.cifrador.descifrar(fila.accessTokenCifrado),
      refreshToken: fila.refreshTokenCifrado
        ? this.cifrador.descifrar(fila.refreshTokenCifrado)
        : null,
      scopes: fila.scopes,
      expiraEn: fila.expiraEn,
      creadoEn: fila.creadoEn,
      actualizadoEn: fila.actualizadoEn,
    });
  }
}
