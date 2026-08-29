import type { PrismaClient, Usuario as UsuarioFila } from "@prisma/client";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import { Usuario, type RolUsuario } from "@/dominio/entidades/Usuario";

/**
 * Implementación con Prisma del repositorio de Usuario.
 * Lo usa Auth.js (vía contenedor) para autenticar por email.
 */
export class PrismaRepositorioUsuario implements IUsuarioRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(usuario: Usuario): Promise<Usuario> {
    const datos = usuario.aPrimitivos();
    const fila = await this.prisma.usuario.create({
      data: {
        id: datos.id,
        email: datos.email,
        passwordHash: datos.passwordHash,
        rol: datos.rol,
        pacienteId: datos.pacienteId,
        nutricionistaId: datos.nutricionistaId,
        activo: datos.activo,
        creadoEn: datos.creadoEn,
      },
    });
    return this.mapearAUsuario(fila);
  }

  async actualizar(usuario: Usuario): Promise<Usuario> {
    const datos = usuario.aPrimitivos();
    const fila = await this.prisma.usuario.update({
      where: { id: datos.id },
      data: {
        email: datos.email,
        passwordHash: datos.passwordHash,
        rol: datos.rol,
        pacienteId: datos.pacienteId,
        activo: datos.activo,
      },
    });
    return this.mapearAUsuario(fila);
  }

  async obtenerPorId(id: string): Promise<Usuario | null> {
    const fila = await this.prisma.usuario.findUnique({ where: { id } });
    return fila ? this.mapearAUsuario(fila) : null;
  }

  async obtenerPorPacienteId(pacienteId: string): Promise<Usuario | null> {
    const fila = await this.prisma.usuario.findUnique({
      where: { pacienteId },
    });
    return fila ? this.mapearAUsuario(fila) : null;
  }

  async listarPorRol(rol: RolUsuario): Promise<Usuario[]> {
    const filas = await this.prisma.usuario.findMany({ where: { rol } });
    return filas.map((fila) => this.mapearAUsuario(fila));
  }

  async eliminarPorPacienteId(pacienteId: string): Promise<void> {
    await this.prisma.usuario.deleteMany({ where: { pacienteId } });
  }

  async obtenerPorEmail(email: string): Promise<Usuario | null> {
    const fila = await this.prisma.usuario.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    return fila ? this.mapearAUsuario(fila) : null;
  }

  /** Mapea una fila de Prisma a la entidad de dominio Usuario. */
  private mapearAUsuario(fila: UsuarioFila): Usuario {
    return Usuario.reconstruir({
      id: fila.id,
      email: fila.email,
      passwordHash: fila.passwordHash,
      rol: fila.rol,
      pacienteId: fila.pacienteId,
      nutricionistaId: fila.nutricionistaId,
      activo: fila.activo,
      creadoEn: fila.creadoEn,
    });
  }
}
