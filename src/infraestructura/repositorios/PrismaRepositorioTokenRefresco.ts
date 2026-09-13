import type { PrismaClient, TokenRefresco as TokenFila } from "@prisma/client";
import type { ITokenRefrescoRepositorio } from "@/dominio/repositorios/ITokenRefrescoRepositorio";
import { TokenRefresco } from "@/dominio/entidades/TokenRefresco";

/**
 * Implementación con Prisma del repositorio de tokens de refresco.
 *
 * La tabla NO es de inquilino (se referencia por usuarioId, y el flujo corre
 * con alcance global, igual que el login). Solo guarda el hash del token, nunca
 * el valor en claro que vive en la cookie.
 */
export class PrismaRepositorioTokenRefresco implements ITokenRefrescoRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(token: TokenRefresco): Promise<TokenRefresco> {
    const datos = token.aPrimitivos();
    const fila = await this.prisma.tokenRefresco.create({
      data: {
        id: datos.id,
        usuarioId: datos.usuarioId,
        familia: datos.familia,
        tokenHash: datos.tokenHash,
        expiraEn: datos.expiraEn,
        usadoEn: datos.usadoEn,
        revocadoEn: datos.revocadoEn,
        dispositivo: datos.dispositivo,
        creadoEn: datos.creadoEn,
      },
    });
    return mapearTokenRefresco(fila);
  }

  async obtenerPorHash(tokenHash: string): Promise<TokenRefresco | null> {
    const fila = await this.prisma.tokenRefresco.findUnique({
      where: { tokenHash },
    });
    return fila ? mapearTokenRefresco(fila) : null;
  }

  async marcarUsado(id: string, usadoEn: Date): Promise<void> {
    await this.prisma.tokenRefresco.update({
      where: { id },
      data: { usadoEn },
    });
  }

  async revocarFamilia(familia: string, revocadoEn: Date): Promise<void> {
    // Solo los que siguen vivos: pisar `revocadoEn` de los ya revocados
    // reescribiría cuándo cayó cada uno sin cambiar nada.
    await this.prisma.tokenRefresco.updateMany({
      where: { familia, revocadoEn: null },
      data: { revocadoEn },
    });
  }

  async revocarDeUsuario(usuarioId: string, revocadoEn: Date): Promise<void> {
    await this.prisma.tokenRefresco.updateMany({
      where: { usuarioId, revocadoEn: null },
      data: { revocadoEn },
    });
  }

  async eliminarCaducados(limite: Date): Promise<number> {
    const { count } = await this.prisma.tokenRefresco.deleteMany({
      where: {
        OR: [{ expiraEn: { lt: limite } }, { revocadoEn: { lt: limite } }],
      },
    });
    return count;
  }
}

export function mapearTokenRefresco(fila: TokenFila): TokenRefresco {
  return TokenRefresco.reconstruir({
    id: fila.id,
    usuarioId: fila.usuarioId,
    familia: fila.familia,
    tokenHash: fila.tokenHash,
    expiraEn: fila.expiraEn,
    usadoEn: fila.usadoEn,
    revocadoEn: fila.revocadoEn,
    dispositivo: fila.dispositivo,
    creadoEn: fila.creadoEn,
  });
}
