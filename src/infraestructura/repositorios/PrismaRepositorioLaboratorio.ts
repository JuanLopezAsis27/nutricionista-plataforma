import type { PrismaClient, Prisma } from "@prisma/client";
import type { ILaboratorioRepositorio } from "@/dominio/repositorios/ILaboratorioRepositorio";
import { Laboratorio } from "@/dominio/entidades/Laboratorio";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/** Fila de laboratorio con sus archivos incluidos. */
type LaboratorioConArchivos = Prisma.LaboratorioGetPayload<{
  include: { archivos: true };
}>;

/**
 * Implementación con Prisma del repositorio de Laboratorios.
 * Vincula archivos ya subidos (fija Archivo.laboratorioId) en la misma
 * transacción que crea/actualiza el estudio.
 */
export class PrismaRepositorioLaboratorio implements ILaboratorioRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(
    laboratorio: Laboratorio,
    archivoIds: string[],
  ): Promise<Laboratorio> {
    const datos = laboratorio.aPrimitivos();
    const fila = await this.prisma.$transaction(async (tx) => {
      await tx.laboratorio.create({
        data: {
          nutricionistaId: inquilinoActual(),
          id: datos.id,
          pacienteId: datos.pacienteId,
          fecha: this.soloFecha(datos.fecha),
          titulo: datos.titulo,
          notas: datos.notas,
          creadoEn: datos.creadoEn,
        },
      });
      if (archivoIds.length > 0) {
        await tx.archivo.updateMany({
          where: { id: { in: archivoIds } },
          data: { laboratorioId: datos.id },
        });
      }
      return tx.laboratorio.findUniqueOrThrow({
        where: { id: datos.id },
        include: { archivos: true },
      });
    });
    return mapearLaboratorio(fila);
  }

  async actualizar(
    laboratorio: Laboratorio,
    archivoIdsNuevos: string[],
  ): Promise<Laboratorio> {
    const datos = laboratorio.aPrimitivos();
    const fila = await this.prisma.$transaction(async (tx) => {
      await tx.laboratorio.update({
        where: { id: datos.id },
        data: {
          fecha: this.soloFecha(datos.fecha),
          titulo: datos.titulo,
          notas: datos.notas,
        },
      });
      if (archivoIdsNuevos.length > 0) {
        await tx.archivo.updateMany({
          where: { id: { in: archivoIdsNuevos } },
          data: { laboratorioId: datos.id },
        });
      }
      return tx.laboratorio.findUniqueOrThrow({
        where: { id: datos.id },
        include: { archivos: true },
      });
    });
    return mapearLaboratorio(fila);
  }

  async eliminar(id: string): Promise<void> {
    // Las filas de archivos caen en cascada; los objetos del bucket los
    // elimina el caso de uso (EliminarLaboratorio).
    await this.prisma.laboratorio.delete({ where: { id } });
  }

  async obtenerPorId(id: string): Promise<Laboratorio | null> {
    const fila = await this.prisma.laboratorio.findUnique({
      where: { id },
      include: { archivos: true },
    });
    return fila ? mapearLaboratorio(fila) : null;
  }

  async listarPorPaciente(pacienteId: string): Promise<Laboratorio[]> {
    const filas = await this.prisma.laboratorio.findMany({
      where: { pacienteId },
      include: { archivos: true },
      orderBy: { fecha: "desc" },
    });
    return filas.map((fila) => mapearLaboratorio(fila));
  }

  private soloFecha(fecha: Date): Date {
    return new Date(
      Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()),
    );
  }
}

export function mapearLaboratorio(fila: LaboratorioConArchivos): Laboratorio {
  return Laboratorio.reconstruir({
    id: fila.id,
    pacienteId: fila.pacienteId,
    fecha: fila.fecha,
    titulo: fila.titulo,
    notas: fila.notas,
    adjuntos: fila.archivos.map((archivo) => ({
      id: archivo.id,
      nombreOriginal: archivo.nombreOriginal,
      mimeType: archivo.mimeType,
      tamanoBytes: archivo.tamanoBytes,
    })),
    creadoEn: fila.creadoEn,
  });
}
