import type {
  PrismaClient,
  TokenRecuperacion as TokenFila,
} from "@prisma/client";
import type { ITokenRecuperacionRepositorio } from "@/dominio/repositorios/ITokenRecuperacionRepositorio";
import { TokenRecuperacion } from "@/dominio/entidades/TokenRecuperacion";

/**
 * Implementación con Prisma del repositorio de tokens de recuperación.
 *
 * La tabla NO es de inquilino (se referencia por usuarioId, y el flujo corre
 * con alcance global). Solo guarda el hash del token, nunca el valor en claro.
 */
export class PrismaRepositorioTokenRecuperacion implements ITokenRecuperacionRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(token: TokenRecuperacion): Promise<TokenRecuperacion> {
    const datos = token.aPrimitivos();
    const fila = await this.prisma.tokenRecuperacion.create({
      data: {
        id: datos.id,
        usuarioId: datos.usuarioId,
        tokenHash: datos.tokenHash,
        expiraEn: datos.expiraEn,
        usadoEn: datos.usadoEn,
        creadoEn: datos.creadoEn,
      },
    });
    return this.mapear(fila);
  }

  async obtenerPorHash(tokenHash: string): Promise<TokenRecuperacion | null> {
    const fila = await this.prisma.tokenRecuperacion.findUnique({
      where: { tokenHash },
    });
    return fila ? this.mapear(fila) : null;
  }

  async marcarUsado(id: string, usadoEn: Date): Promise<void> {
    await this.prisma.tokenRecuperacion.update({
      where: { id },
      data: { usadoEn },
    });
  }

  async eliminarDeUsuario(usuarioId: string): Promise<void> {
    await this.prisma.tokenRecuperacion.deleteMany({ where: { usuarioId } });
  }

  private mapear(fila: TokenFila): TokenRecuperacion {
    return TokenRecuperacion.reconstruir({
      id: fila.id,
      usuarioId: fila.usuarioId,
      tokenHash: fila.tokenHash,
      expiraEn: fila.expiraEn,
      usadoEn: fila.usadoEn,
      creadoEn: fila.creadoEn,
    });
  }
}
