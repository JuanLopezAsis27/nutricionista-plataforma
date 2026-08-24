import type { PrismaClient, Prisma } from "@prisma/client";
import type {
  IMaterialRepositorio,
  FiltroMateriales,
} from "@/dominio/repositorios/IMaterialRepositorio";
import { MaterialBiblioteca } from "@/dominio/entidades/MaterialBiblioteca";

/** Include estándar: el archivo del bucket (si el material es tipo ARCHIVO). */
const INCLUIR_ARCHIVO = { archivo: true } satisfies Prisma.MaterialBibliotecaInclude;

type MaterialConArchivo = Prisma.MaterialBibliotecaGetPayload<{
  include: typeof INCLUIR_ARCHIVO;
}>;

/**
 * Implementación con Prisma del repositorio de la Biblioteca.
 * Vincula el archivo ya subido (fija Archivo.materialId) en la misma
 * transacción que crea el material.
 */
export class PrismaRepositorioMaterial implements IMaterialRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(
    material: MaterialBiblioteca,
    archivoId?: string | null,
  ): Promise<MaterialBiblioteca> {
    const d = material.aPrimitivos();
    const fila = await this.prisma.$transaction(async (tx) => {
      await tx.materialBiblioteca.create({
        data: {
          id: d.id,
          tipo: d.tipo,
          titulo: d.titulo,
          descripcion: d.descripcion,
          url: d.url,
          categoria: d.categoria,
          etiquetas: d.etiquetas,
          creadoEn: d.creadoEn,
          actualizadoEn: d.actualizadoEn,
        },
      });
      if (archivoId) {
        await tx.archivo.update({
          where: { id: archivoId },
          data: { materialId: d.id },
        });
      }
      return tx.materialBiblioteca.findUniqueOrThrow({
        where: { id: d.id },
        include: INCLUIR_ARCHIVO,
      });
    });
    return this.mapear(fila);
  }

  async actualizar(material: MaterialBiblioteca): Promise<MaterialBiblioteca> {
    const d = material.aPrimitivos();
    const fila = await this.prisma.materialBiblioteca.update({
      where: { id: d.id },
      data: {
        titulo: d.titulo,
        descripcion: d.descripcion,
        url: d.url,
        categoria: d.categoria,
        etiquetas: d.etiquetas,
      },
      include: INCLUIR_ARCHIVO,
    });
    return this.mapear(fila);
  }

  async eliminar(id: string): Promise<void> {
    // La fila del archivo y las asignaciones caen en cascada; el objeto del
    // bucket lo borra el caso de uso (EliminarMaterial).
    await this.prisma.materialBiblioteca.delete({ where: { id } });
  }

  async obtenerPorId(id: string): Promise<MaterialBiblioteca | null> {
    const fila = await this.prisma.materialBiblioteca.findUnique({
      where: { id },
      include: INCLUIR_ARCHIVO,
    });
    return fila ? this.mapear(fila) : null;
  }

  async listar(filtro?: FiltroMateriales): Promise<MaterialBiblioteca[]> {
    const filas = await this.prisma.materialBiblioteca.findMany({
      where: this.construirWhere(filtro),
      include: INCLUIR_ARCHIVO,
      orderBy: { titulo: "asc" },
      skip: filtro?.desplazamiento,
      take: filtro?.limite,
    });
    return filas.map((fila) => this.mapear(fila));
  }

  contar(filtro?: FiltroMateriales): Promise<number> {
    return this.prisma.materialBiblioteca.count({ where: this.construirWhere(filtro) });
  }

  private construirWhere(filtro?: FiltroMateriales): Prisma.MaterialBibliotecaWhereInput {
    const where: Prisma.MaterialBibliotecaWhereInput = {};
    if (filtro?.texto) {
      where.OR = [
        { titulo: { contains: filtro.texto, mode: "insensitive" } },
        { descripcion: { contains: filtro.texto, mode: "insensitive" } },
      ];
    }
    if (filtro?.categoria) {
      where.categoria = { equals: filtro.categoria, mode: "insensitive" };
    }
    if (filtro?.etiqueta) {
      where.etiquetas = { has: filtro.etiqueta };
    }
    return where;
  }

  async asignarAPaciente(materialId: string, pacienteId: string, id: string): Promise<void> {
    await this.prisma.asignacionMaterial.upsert({
      where: { materialId_pacienteId: { materialId, pacienteId } },
      create: { id, materialId, pacienteId },
      update: {},
    });
  }

  async desasignarDePaciente(materialId: string, pacienteId: string): Promise<void> {
    await this.prisma.asignacionMaterial.deleteMany({ where: { materialId, pacienteId } });
  }

  async listarPorPaciente(pacienteId: string): Promise<MaterialBiblioteca[]> {
    const filas = await this.prisma.materialBiblioteca.findMany({
      where: { asignaciones: { some: { pacienteId } } },
      include: INCLUIR_ARCHIVO,
      orderBy: { titulo: "asc" },
    });
    return filas.map((fila) => this.mapear(fila));
  }

  async listarPacientesAsignados(materialId: string): Promise<string[]> {
    const filas = await this.prisma.asignacionMaterial.findMany({
      where: { materialId },
      select: { pacienteId: true },
    });
    return filas.map((f) => f.pacienteId);
  }

  private mapear(fila: MaterialConArchivo): MaterialBiblioteca {
    return MaterialBiblioteca.reconstruir({
      id: fila.id,
      tipo: fila.tipo,
      titulo: fila.titulo,
      descripcion: fila.descripcion,
      url: fila.url,
      categoria: fila.categoria,
      etiquetas: fila.etiquetas,
      archivo: fila.archivo
        ? {
            id: fila.archivo.id,
            nombreOriginal: fila.archivo.nombreOriginal,
            mimeType: fila.archivo.mimeType,
          }
        : null,
      creadoEn: fila.creadoEn,
      actualizadoEn: fila.actualizadoEn,
    });
  }
}
