import type { PrismaClient, GrupoMaterial as GrupoFila } from "@prisma/client";
import type {
  IGrupoMaterialRepositorio,
  GrupoMaterialConTotal,
} from "@/dominio/repositorios/IGrupoMaterialRepositorio";
import { GrupoMaterial } from "@/dominio/entidades/GrupoMaterial";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";
import { RepositorioPrismaBase } from "./base/RepositorioPrismaBase";

/** Implementación con Prisma del repositorio de carpetas de la biblioteca. */
export class PrismaRepositorioGrupoMaterial
  extends RepositorioPrismaBase<GrupoFila, GrupoMaterial>
  implements IGrupoMaterialRepositorio
{
  constructor(private readonly prisma: PrismaClient) {
    super(prisma.grupoMaterial);
  }

  async crear(grupo: GrupoMaterial): Promise<GrupoMaterial> {
    const d = grupo.aPrimitivos();
    const fila = await this.prisma.grupoMaterial.create({
      data: { nutricionistaId: inquilinoActual(), ...d },
    });
    return mapearGrupoMaterial(fila);
  }

  async actualizar(grupo: GrupoMaterial): Promise<GrupoMaterial> {
    const d = grupo.aPrimitivos();
    const fila = await this.prisma.grupoMaterial.update({
      where: { id: d.id },
      data: { nombre: d.nombre, descripcion: d.descripcion },
    });
    return mapearGrupoMaterial(fila);
  }

  async listar(): Promise<GrupoMaterialConTotal[]> {
    const filas = await this.prisma.grupoMaterial.findMany({
      orderBy: { nombre: "asc" },
      include: { _count: { select: { materiales: true } } },
    });
    return filas.map((fila) => ({
      grupo: mapearGrupoMaterial(fila),
      cantidadMateriales: fila._count.materiales,
    }));
  }

  async existeNombre(nombre: string, excluirId?: string): Promise<boolean> {
    // `mode: "insensitive"` para que "Guías" y "guías" cuenten como la
    // misma carpeta: nadie las distingue mirando la lista.
    const cantidad = await this.prisma.grupoMaterial.count({
      where: {
        nombre: { equals: nombre, mode: "insensitive" },
        ...(excluirId ? { NOT: { id: excluirId } } : {}),
      },
    });
    return cantidad > 0;
  }

  protected override mapear(fila: GrupoFila): GrupoMaterial {
    return mapearGrupoMaterial(fila);
  }
}

export function mapearGrupoMaterial(fila: GrupoFila): GrupoMaterial {
  return GrupoMaterial.reconstruir({
    id: fila.id,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
  });
}
