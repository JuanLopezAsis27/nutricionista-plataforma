import type { PrismaClient, GrupoReceta as GrupoFila } from "@prisma/client";
import type {
  IGrupoRecetaRepositorio,
  GrupoRecetaConTotal,
} from "@/dominio/repositorios/IGrupoRecetaRepositorio";
import { GrupoReceta } from "@/dominio/entidades/GrupoReceta";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";
import { RepositorioPrismaBase } from "./base/RepositorioPrismaBase";

/** Implementación con Prisma del repositorio de carpetas del recetario. */
export class PrismaRepositorioGrupoReceta
  extends RepositorioPrismaBase<GrupoFila, GrupoReceta>
  implements IGrupoRecetaRepositorio
{
  constructor(private readonly prisma: PrismaClient) {
    super(prisma.grupoReceta);
  }

  async crear(grupo: GrupoReceta): Promise<GrupoReceta> {
    const d = grupo.aPrimitivos();
    const fila = await this.prisma.grupoReceta.create({
      data: { nutricionistaId: inquilinoActual(), ...d },
    });
    return mapearGrupoReceta(fila);
  }

  async actualizar(grupo: GrupoReceta): Promise<GrupoReceta> {
    const d = grupo.aPrimitivos();
    const fila = await this.prisma.grupoReceta.update({
      where: { id: d.id },
      data: { nombre: d.nombre, descripcion: d.descripcion },
    });
    return mapearGrupoReceta(fila);
  }

  async listar(): Promise<GrupoRecetaConTotal[]> {
    const filas = await this.prisma.grupoReceta.findMany({
      orderBy: { nombre: "asc" },
      include: { _count: { select: { recetas: true } } },
    });
    return filas.map((fila) => ({
      grupo: mapearGrupoReceta(fila),
      cantidadRecetas: fila._count.recetas,
    }));
  }

  async existeNombre(nombre: string, excluirId?: string): Promise<boolean> {
    // `mode: "insensitive"` para que "Desayunos" y "desayunos" cuenten como la
    // misma carpeta: nadie las distingue mirando la lista.
    const cantidad = await this.prisma.grupoReceta.count({
      where: {
        nombre: { equals: nombre, mode: "insensitive" },
        ...(excluirId ? { NOT: { id: excluirId } } : {}),
      },
    });
    return cantidad > 0;
  }

  protected override mapear(fila: GrupoFila): GrupoReceta {
    return mapearGrupoReceta(fila);
  }
}

export function mapearGrupoReceta(fila: GrupoFila): GrupoReceta {
  return GrupoReceta.reconstruir({
    id: fila.id,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
  });
}
