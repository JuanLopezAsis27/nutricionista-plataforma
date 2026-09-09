import type { PrismaClient, GrupoPlan as GrupoFila } from "@prisma/client";
import type {
  IGrupoPlanRepositorio,
  GrupoPlanConTotal,
} from "@/dominio/repositorios/IGrupoPlanRepositorio";
import { GrupoPlan } from "@/dominio/entidades/GrupoPlan";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";
import { RepositorioPrismaBase } from "./base/RepositorioPrismaBase";

/** Implementación con Prisma del repositorio de carpetas de planes. */
export class PrismaRepositorioGrupoPlan
  extends RepositorioPrismaBase<GrupoFila, GrupoPlan>
  implements IGrupoPlanRepositorio
{
  constructor(private readonly prisma: PrismaClient) {
    super(prisma.grupoPlan);
  }

  async crear(grupo: GrupoPlan): Promise<GrupoPlan> {
    const d = grupo.aPrimitivos();
    const fila = await this.prisma.grupoPlan.create({
      data: { nutricionistaId: inquilinoActual(), ...d },
    });
    return mapearGrupoPlan(fila);
  }

  async actualizar(grupo: GrupoPlan): Promise<GrupoPlan> {
    const d = grupo.aPrimitivos();
    const fila = await this.prisma.grupoPlan.update({
      where: { id: d.id },
      data: { nombre: d.nombre, descripcion: d.descripcion },
    });
    return mapearGrupoPlan(fila);
  }

  async listar(): Promise<GrupoPlanConTotal[]> {
    // Dos consultas y no una por carpeta: `_count` no sabe devolver el mismo
    // vínculo contado de dos maneras (planes y plantillas), y un `include` por
    // carpeta sería un N+1 sobre una lista que se pide en cada pantalla.
    const [filas, conteos] = await Promise.all([
      this.prisma.grupoPlan.findMany({ orderBy: { nombre: "asc" } }),
      this.prisma.planNutricional.groupBy({
        by: ["grupoId", "esPlantilla"],
        where: { grupoId: { not: null } },
        _count: { _all: true },
      }),
    ]);

    const contar = (grupoId: string, esPlantilla: boolean): number =>
      conteos.find(
        (c) => c.grupoId === grupoId && c.esPlantilla === esPlantilla,
      )?._count._all ?? 0;

    return filas.map((fila) => ({
      grupo: mapearGrupoPlan(fila),
      cantidadPlanes: contar(fila.id, false),
      cantidadPlantillas: contar(fila.id, true),
    }));
  }

  async existeNombre(nombre: string, excluirId?: string): Promise<boolean> {
    // `mode: "insensitive"` para que "Descenso" y "descenso" cuenten como la
    // misma carpeta: nadie las distingue mirando la lista.
    const cantidad = await this.prisma.grupoPlan.count({
      where: {
        nombre: { equals: nombre, mode: "insensitive" },
        ...(excluirId ? { NOT: { id: excluirId } } : {}),
      },
    });
    return cantidad > 0;
  }

  protected override mapear(fila: GrupoFila): GrupoPlan {
    return mapearGrupoPlan(fila);
  }
}

export function mapearGrupoPlan(fila: GrupoFila): GrupoPlan {
  return GrupoPlan.reconstruir({
    id: fila.id,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
  });
}
