import type {
  PrismaClient,
  Competencia as CompetenciaFila,
} from "@prisma/client";
import type { ICompetenciaRepositorio } from "@/dominio/repositorios/ICompetenciaRepositorio";
import { Competencia } from "@/dominio/entidades/Competencia";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";
import { RepositorioPrismaBase } from "./base/RepositorioPrismaBase";
import { soloFecha } from "./base/fechas";

/**
 * Implementación con Prisma del repositorio de competencias.
 * El aislamiento por inquilino lo aplica la extensión de Prisma.
 */
export class PrismaRepositorioCompetencia
  extends RepositorioPrismaBase<CompetenciaFila, Competencia>
  implements ICompetenciaRepositorio
{
  constructor(private readonly prisma: PrismaClient) {
    super(prisma.competencia);
  }

  async crear(competencia: Competencia): Promise<Competencia> {
    const d = competencia.aPrimitivos();
    const fila = await this.prisma.competencia.create({
      data: {
        nutricionistaId: inquilinoActual(),
        id: d.id,
        pacienteId: d.pacienteId,
        nombre: d.nombre,
        fecha: soloFecha(d.fecha),
        lugar: d.lugar,
        objetivo: d.objetivo,
        resultado: d.resultado,
        importancia: d.importancia,
        notas: d.notas,
        creadoEn: d.creadoEn,
      },
    });
    return mapearCompetencia(fila);
  }

  async actualizar(competencia: Competencia): Promise<Competencia> {
    const d = competencia.aPrimitivos();
    const fila = await this.prisma.competencia.update({
      where: { id: d.id },
      data: {
        nombre: d.nombre,
        fecha: soloFecha(d.fecha),
        lugar: d.lugar,
        objetivo: d.objetivo,
        resultado: d.resultado,
        importancia: d.importancia,
        notas: d.notas,
      },
    });
    return mapearCompetencia(fila);
  }

  async listarPorPaciente(pacienteId: string): Promise<Competencia[]> {
    const filas = await this.prisma.competencia.findMany({
      where: { pacienteId },
      orderBy: { fecha: "asc" },
    });
    return this.mapearTodas(filas);
  }

  protected override mapear(fila: CompetenciaFila): Competencia {
    return mapearCompetencia(fila);
  }
}

export function mapearCompetencia(fila: CompetenciaFila): Competencia {
  return Competencia.reconstruir({
    id: fila.id,
    pacienteId: fila.pacienteId,
    nombre: fila.nombre,
    fecha: fila.fecha,
    lugar: fila.lugar,
    objetivo: fila.objetivo,
    resultado: fila.resultado,
    importancia: fila.importancia,
    notas: fila.notas,
    creadoEn: fila.creadoEn,
  });
}
