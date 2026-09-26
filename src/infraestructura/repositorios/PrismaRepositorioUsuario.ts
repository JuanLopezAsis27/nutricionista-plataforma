import type {
  Prisma,
  PrismaClient,
  Usuario as UsuarioFila,
} from "@prisma/client";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import { Usuario, type RolUsuario } from "@/dominio/entidades/Usuario";
import { normalizarNombreUsuario } from "@/dominio/servicios/nombreUsuario";
import {
  alcanceActual,
  ejecutarGlobal,
} from "@/infraestructura/multitenancy/contextoTenant";

/**
 * Implementación con Prisma del repositorio de Usuario.
 * Lo usa Auth.js (vía contenedor) para autenticar por email o por usuario.
 *
 * ## Por qué casi todo corre con alcance global
 *
 * `usuarios` es tabla de inquilino, pero desde la migración 78 la cuenta de un
 * PACIENTE no tiene inquilino (`nutricionistaId` NULL): la misma persona puede
 * ser paciente de varios consultorios. El filtro automático de la extensión
 * (`nutricionistaId = <consultorio>`) la volvería invisible para todos, incluso
 * para el propio paciente dentro de su sesión.
 *
 * Así que el filtro se escribe ACÁ, explícito (`visibles`), y la consulta corre
 * con alcance global para que la extensión no le sume el suyo: un consultorio
 * ve su propia cuenta y las de los pacientes dueños de alguna de SUS fichas.
 * Sigue siendo fail-closed: sin alcance fijado, lanza.
 */
export class PrismaRepositorioUsuario implements IUsuarioRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(usuario: Usuario): Promise<Usuario> {
    const datos = usuario.aPrimitivos();
    const data = {
      id: datos.id,
      email: datos.email,
      nombreUsuario: datos.nombreUsuario,
      passwordHash: datos.passwordHash,
      passwordProvisional: datos.passwordProvisional,
      rol: datos.rol,
      nutricionistaId: datos.nutricionistaId,
      activo: datos.activo,
      // Va también en el `create` aunque al alta siempre sea null: un campo
      // que solo se escribe en el `update` se pierde en silencio el día que
      // alguien lo pueble al crear (así se perdió la modalidad del plan).
      fotoPerfilId: datos.fotoPerfilId,
      creadoEn: datos.creadoEn,
    };
    // La cuenta de un paciente no es de ningún consultorio: con alcance de
    // inquilino la extensión le pondría el `nutricionistaId` del que da el
    // alta (y el CHECK de la migración 78 la rechazaría). Es la única escritura
    // global de una fila de esta tabla, y es legítima: la fila no es de nadie.
    const fila = usuario.esPaciente
      ? await ejecutarGlobal(() => this.prisma.usuario.create({ data }))
      : await this.prisma.usuario.create({ data });
    return mapearUsuario(fila);
  }

  async actualizar(usuario: Usuario): Promise<Usuario> {
    const datos = usuario.aPrimitivos();
    const fila = await this.visibles((filtro) =>
      this.prisma.usuario.update({
        where: { id: datos.id, AND: [filtro] },
        data: {
          email: datos.email,
          nombreUsuario: datos.nombreUsuario,
          passwordHash: datos.passwordHash,
          passwordProvisional: datos.passwordProvisional,
          rol: datos.rol,
          activo: datos.activo,
          fotoPerfilId: datos.fotoPerfilId,
        },
      }),
    );
    return mapearUsuario(fila);
  }

  async obtenerPorId(id: string): Promise<Usuario | null> {
    const fila = await this.visibles((filtro) =>
      this.prisma.usuario.findFirst({ where: { id, ...filtro } }),
    );
    return fila ? mapearUsuario(fila) : null;
  }

  async obtenerPorPacienteId(pacienteId: string): Promise<Usuario | null> {
    // `pacientes` es tabla de inquilino: la extensión acota la ficha al
    // consultorio en curso, y la cuenta viene anidada (sin filtro propio).
    const ficha = await this.prisma.paciente.findUnique({
      where: { id: pacienteId },
      select: { usuario: true },
    });
    return ficha?.usuario ? mapearUsuario(ficha.usuario) : null;
  }

  async listarPorRol(rol: RolUsuario): Promise<Usuario[]> {
    const filas = await this.visibles((filtro) =>
      this.prisma.usuario.findMany({ where: { rol, ...filtro } }),
    );
    return filas.map((fila) => mapearUsuario(fila));
  }

  async eliminar(id: string): Promise<void> {
    // Además de las visibles, la cuenta de paciente SIN ninguna ficha: no es
    // de nadie (la compensación de un alta que falló a mitad de camino).
    await this.visibles((filtro) =>
      this.prisma.usuario.deleteMany({
        where: {
          id,
          OR: [filtro, { rol: "PACIENTE", fichas: { none: {} } }],
        },
      }),
    );
  }

  async obtenerPorEmail(email: string): Promise<Usuario | null> {
    const fila = await this.visibles((filtro) =>
      this.prisma.usuario.findFirst({
        where: { email: email.trim().toLowerCase(), ...filtro },
      }),
    );
    return fila ? mapearUsuario(fila) : null;
  }

  async obtenerPorNombreUsuario(
    nombreUsuario: string,
  ): Promise<Usuario | null> {
    const fila = await this.visibles((filtro) =>
      this.prisma.usuario.findFirst({
        where: {
          nombreUsuario: normalizarNombreUsuario(nombreUsuario),
          ...filtro,
        },
      }),
    );
    return fila ? mapearUsuario(fila) : null;
  }

  /** Global por lo mismo que `emailYaRegistrado`: el índice único lo es. */
  async nombreUsuarioYaRegistrado(nombreUsuario: string): Promise<boolean> {
    return ejecutarGlobal(async () => {
      const fila = await this.prisma.usuario.findUnique({
        where: { nombreUsuario: normalizarNombreUsuario(nombreUsuario) },
        select: { id: true },
      });
      return fila !== null;
    });
  }

  /**
   * Pregunta por el email SIN el filtro de inquilino, porque la restricción que
   * se está comprobando tampoco lo tiene: `usuarios.email` es único global.
   *
   * `ejecutarGlobal` acá es deliberado y no una fuga: lo único que cruza el
   * límite es un booleano —ni la cuenta, ni el consultorio al que pertenece—,
   * que es exactamente lo que hace falta para decidir si el email está libre.
   * Ver el comentario de la interfaz.
   */
  async emailYaRegistrado(email: string): Promise<boolean> {
    return ejecutarGlobal(async () => {
      const fila = await this.prisma.usuario.findUnique({
        where: { email: email.trim().toLowerCase() },
        select: { id: true },
      });
      return fila !== null;
    });
  }

  async obtenerPorEmailGlobal(email: string): Promise<Usuario | null> {
    const fila = await ejecutarGlobal(() =>
      this.prisma.usuario.findUnique({
        where: { email: email.trim().toLowerCase() },
      }),
    );
    return fila ? mapearUsuario(fila) : null;
  }

  async esFotoDePerfil(archivoId: string): Promise<boolean> {
    // `findFirst` y no `count`: alcanza con que exista una. El filtro de
    // `visibles` acota la consulta a las cuentas del consultorio en curso, que
    // es lo que hace que un paciente no pueda usar esto para leer la foto de un
    // usuario de otro consultorio.
    const fila = await this.visibles((filtro) =>
      this.prisma.usuario.findFirst({
        where: { fotoPerfilId: archivoId, ...filtro },
        select: { id: true },
      }),
    );
    return fila !== null;
  }

  /**
   * Corre la consulta con alcance global y el filtro de visibilidad escrito a
   * mano (ver el comentario de la clase). Fail-closed como la extensión: sin
   * alcance fijado, lanza en vez de devolver cuentas de todos.
   */
  private visibles<T>(
    consulta: (filtro: Prisma.UsuarioWhereInput) => Promise<T>,
  ): Promise<T> {
    const alcance = alcanceActual();
    if (!alcance) {
      throw new Error(
        'Acceso a "Usuario" sin contexto de inquilino. Falta fijar el alcance (fijarAlcance / ejecutarEnNutricionista / ejecutarGlobal).',
      );
    }
    if (alcance.tipo === "global") {
      return consulta({});
    }
    const consultorio = alcance.nutricionistaId;
    return ejecutarGlobal(() =>
      consulta({
        OR: [
          { nutricionistaId: consultorio },
          {
            rol: "PACIENTE",
            fichas: { some: { nutricionistaId: consultorio } },
          },
        ],
      }),
    );
  }
}

/** Mapea una fila de Prisma a la entidad de dominio Usuario. */
export function mapearUsuario(fila: UsuarioFila): Usuario {
  return Usuario.reconstruir({
    id: fila.id,
    email: fila.email,
    nombreUsuario: fila.nombreUsuario,
    passwordHash: fila.passwordHash,
    rol: fila.rol,
    nutricionistaId: fila.nutricionistaId,
    activo: fila.activo,
    passwordProvisional: fila.passwordProvisional,
    fotoPerfilId: fila.fotoPerfilId,
    creadoEn: fila.creadoEn,
  });
}
