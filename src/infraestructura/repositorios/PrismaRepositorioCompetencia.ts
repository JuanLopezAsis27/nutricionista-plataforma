import type { PrismaClient, Competencia as CompetenciaFila } from "@prisma/client";
import type { ICompetenciaRepositorio } from "@/dominio/repositorios/ICompetenciaRepositorio";
import { Competencia } from "@/dominio/entidades/Competencia";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/**
 * Implementación con Prisma del repositorio de competencias.
 * El aislamiento por inquilino lo aplica la extensión de Prisma.
 */
export class PrismaRepositorioCompetencia implements ICompetenciaRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(competencia: Competencia): Promise<Competencia> {
    const d = competencia.aPrimitivos();
    const fila = await this.prisma.competencia.create({
      data: {
        nutricionistaId: inquilinoActual(),
        id: d.id,
        pacienteId: d.pacienteId,
        nombre: d.nombre,
        fecha: this.soloFecha(d.fecha),
        lugar: d.lugar,
        objetivo: d.objetivo,
        resultado: d.resultado,
        importancia: d.importancia,
        notas: d.notas,
        creadoEn: d.creadoEn,
      },
    });
    return this.mapear(fila);
  }

  async actualizar(competencia: Competencia): Promise<Competencia> {
    const d = competencia.aPrimitivos();
    const fila = await this.prisma.competencia.update({
      where: { id: d.id },
      data: {
        nombre: d.nombre,
        fecha: this.soloFecha(d.fecha),
        lugar: d.lugar,
        objetivo: d.objetivo,
        resultado: d.resultado,
        importancia: d.importancia,
        notas: d.notas,
      },
    });
    return this.mapear(fila);
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.competencia.delete({ where: { id } });
  }

  async obtenerPorId(id: string): Promise<Competencia | null> {
    const fila = await this.prisma.competencia.findUnique({ where: { id } });
    return fila ? this.mapear(fila) : null;
  }

  async listarPorPaciente(pacienteId: string): Promise<Competencia[]> {
    const filas = await this.prisma.competencia.findMany({
      where: { pacienteId },
      orderBy: { fecha: "asc" },
    });
    return filas.map((fila) => this.mapear(fila));
  }

  private soloFecha(fecha: Date): Date {
    return new Date(
      Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()),
    );
  }

  private mapear(fila: CompetenciaFila): Competencia {
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
}
