import type {
  PrismaClient,
  GrupoPlanificacion as GrupoFila,
} from "@prisma/client";
import type {
  IGrupoPlanRepositorio,
  GrupoPlanConTotal,
} from "@/dominio/repositorios/IGrupoPlanRepositorio";
import { GrupoPlan } from "@/dominio/entidades/GrupoPlan";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";
import { RepositorioPrismaBase } from "./base/RepositorioPrismaBase";

/**
 * Carpetas de planificaciones deportivas (migración 94).
 *
 * Cumplen el MISMO contrato que las carpetas de planes (`IGrupoPlanRepositorio`)
 * y se modelan con la misma entidad: son la misma idea —un rótulo con nombre
 * único, que puede ser la carpeta de un paciente— sobre otra colección. Así
 * los casos de uso de las carpetas de planes sirven tal cual. Las plantillas
 * no existen acá: `cantidadPlantillas` es siempre 0.
 */
export class PrismaRepositorioGrupoPlanificacion
  extends RepositorioPrismaBase<GrupoFila, GrupoPlan>
  implements IGrupoPlanRepositorio
{
  constructor(private readonly prisma: PrismaClient) {
    super(prisma.grupoPlanificacion);
  }

  async crear(grupo: GrupoPlan): Promise<GrupoPlan> {
    const d = grupo.aPrimitivos();
    const fila = await this.prisma.grupoPlanificacion.create({
      data: { nutricionistaId: inquilinoActual(), ...d },
    });
    return mapearGrupo(fila);
  }

  async actualizar(grupo: GrupoPlan): Promise<GrupoPlan> {
    const d = grupo.aPrimitivos();
    const fila = await this.prisma.grupoPlanificacion.update({
      where: { id: d.id },
      data: { nombre: d.nombre, descripcion: d.descripcion },
    });
    return mapearGrupo(fila);
  }

  async obtenerPorPaciente(pacienteId: string): Promise<GrupoPlan | null> {
    const fila = await this.prisma.grupoPlanificacion.findUnique({
      where: { pacienteId },
    });
    return fila ? mapearGrupo(fila) : null;
  }

  async listar(): Promise<GrupoPlanConTotal[]> {
    const filas = await this.prisma.grupoPlanificacion.findMany({
      orderBy: { nombre: "asc" },
      include: { _count: { select: { planificaciones: true } } },
    });
    return filas.map((fila) => ({
      grupo: mapearGrupo(fila),
      cantidadPlanes: fila._count.planificaciones,
      cantidadPlantillas: 0,
    }));
  }

  async existeNombre(nombre: string, excluirId?: string): Promise<boolean> {
    const cantidad = await this.prisma.grupoPlanificacion.count({
      where: {
        nombre: { equals: nombre, mode: "insensitive" },
        ...(excluirId ? { NOT: { id: excluirId } } : {}),
      },
    });
    return cantidad > 0;
  }

  protected override mapear(fila: GrupoFila): GrupoPlan {
    return mapearGrupo(fila);
  }
}

function mapearGrupo(fila: GrupoFila): GrupoPlan {
  return GrupoPlan.reconstruir({
    id: fila.id,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    pacienteId: fila.pacienteId,
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
  });
}
