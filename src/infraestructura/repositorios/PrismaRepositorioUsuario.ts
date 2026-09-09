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
        // Va también en el `create` aunque al alta siempre sea null: un campo
        // que solo se escribe en el `update` se pierde en silencio el día que
        // alguien lo pueble al crear (así se perdió la modalidad del plan).
        fotoPerfilId: datos.fotoPerfilId,
        creadoEn: datos.creadoEn,
      },
    });
    return mapearUsuario(fila);
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
        fotoPerfilId: datos.fotoPerfilId,
      },
    });
    return mapearUsuario(fila);
  }

  async obtenerPorId(id: string): Promise<Usuario | null> {
    const fila = await this.prisma.usuario.findUnique({ where: { id } });
    return fila ? mapearUsuario(fila) : null;
  }

  async obtenerPorPacienteId(pacienteId: string): Promise<Usuario | null> {
    const fila = await this.prisma.usuario.findUnique({
      where: { pacienteId },
    });
    return fila ? mapearUsuario(fila) : null;
  }

  async listarPorRol(rol: RolUsuario): Promise<Usuario[]> {
    const filas = await this.prisma.usuario.findMany({ where: { rol } });
    return filas.map((fila) => mapearUsuario(fila));
  }

  async eliminarPorPacienteId(pacienteId: string): Promise<void> {
    await this.prisma.usuario.deleteMany({ where: { pacienteId } });
  }

  async obtenerPorEmail(email: string): Promise<Usuario | null> {
    const fila = await this.prisma.usuario.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    return fila ? mapearUsuario(fila) : null;
  }

  async esFotoDePerfil(archivoId: string): Promise<boolean> {
    // `findFirst` y no `count`: alcanza con que exista una. La extensión de
    // inquilino acota la consulta al consultorio en curso, que es lo que hace
    // que un paciente no pueda usar esto para leer la foto de un usuario de
    // otro consultorio.
    const fila = await this.prisma.usuario.findFirst({
      where: { fotoPerfilId: archivoId },
      select: { id: true },
    });
    return fila !== null;
  }
}

/** Mapea una fila de Prisma a la entidad de dominio Usuario. */
export function mapearUsuario(fila: UsuarioFila): Usuario {
  return Usuario.reconstruir({
    id: fila.id,
    email: fila.email,
    passwordHash: fila.passwordHash,
    rol: fila.rol,
    pacienteId: fila.pacienteId,
    nutricionistaId: fila.nutricionistaId,
    activo: fila.activo,
    fotoPerfilId: fila.fotoPerfilId,
    creadoEn: fila.creadoEn,
  });
}
