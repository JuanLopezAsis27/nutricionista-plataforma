import type { PrismaClient, Prisma } from "@prisma/client";
import type {
  IRecetaRepositorio,
  FiltroRecetas,
} from "@/dominio/repositorios/IRecetaRepositorio";
import { Receta, type IngredienteDeReceta } from "@/dominio/entidades/Receta";

/** Fila de receta con sus fotos e ingredientes incluidos. */
type RecetaConDetalle = Prisma.RecetaGetPayload<{
  include: { fotos: true; ingredientes: true };
}>;

const INCLUIR = {
  fotos: true,
  ingredientes: { orderBy: { orden: "asc" } },
} satisfies Prisma.RecetaInclude;

/** Decimal (o null) → number (o null). El Decimal nunca cruza a capas altas. */
function aNumero(valor: Prisma.Decimal | null): number | null {
  return valor === null ? null : Number(valor);
}

/** Datos de una fila de ingrediente a persistir (orden = posición en la lista). */
function datosIngrediente(ing: IngredienteDeReceta, orden: number) {
  return {
    nombre: ing.nombre,
    cantidadGramos: ing.cantidadGramos,
    caloriasPor100: ing.caloriasPor100,
    proteinasPor100: ing.proteinasPor100,
    carbohidratosPor100: ing.carbohidratosPor100,
    grasasPor100: ing.grasasPor100,
    fuente: ing.fuente,
    referenciaExterna: ing.referenciaExterna,
    orden,
  };
}

/**
 * Implementación con Prisma del repositorio del Recetario.
 * Persiste los ingredientes estructurados (borrar-y-recrear como agregado),
 * convierte Decimal↔number, vincula fotos ya subidas (fija Archivo.recetaId)
 * y gestiona las asignaciones receta⇄paciente.
 */
export class PrismaRepositorioReceta implements IRecetaRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(receta: Receta, fotoIds: string[]): Promise<Receta> {
    const d = receta.aPrimitivos();
    const fila = await this.prisma.$transaction(async (tx) => {
      await tx.receta.create({
        data: {
          id: d.id,
          nombre: d.nombre,
          descripcion: d.descripcion,
          porciones: d.porciones,
          preparacion: d.preparacion,
          etiquetas: d.etiquetas,
          calorias: d.calorias,
          proteinasG: d.proteinasG,
          carbohidratosG: d.carbohidratosG,
          grasasG: d.grasasG,
          creadoEn: d.creadoEn,
          actualizadoEn: d.actualizadoEn,
          ingredientes: { create: d.ingredientes.map(datosIngrediente) },
        },
      });
      await this.vincularFotos(tx, d.id, fotoIds);
      return tx.receta.findUniqueOrThrow({ where: { id: d.id }, include: INCLUIR });
    });
    return this.mapear(fila);
  }

  async actualizar(receta: Receta, fotoIdsNuevos: string[]): Promise<Receta> {
    const d = receta.aPrimitivos();
    const fila = await this.prisma.$transaction(async (tx) => {
      await tx.receta.update({
        where: { id: d.id },
        data: {
          nombre: d.nombre,
          descripcion: d.descripcion,
          porciones: d.porciones,
          preparacion: d.preparacion,
          etiquetas: d.etiquetas,
          calorias: d.calorias,
          proteinasG: d.proteinasG,
          carbohidratosG: d.carbohidratosG,
          grasasG: d.grasasG,
          // Reemplaza la lista completa de ingredientes (agregado).
          ingredientes: { deleteMany: {}, create: d.ingredientes.map(datosIngrediente) },
        },
      });
      await this.vincularFotos(tx, d.id, fotoIdsNuevos);
      return tx.receta.findUniqueOrThrow({ where: { id: d.id }, include: INCLUIR });
    });
    return this.mapear(fila);
  }

  async eliminar(id: string): Promise<void> {
    // Fotos, ingredientes y asignaciones caen en cascada; los objetos del bucket
    // los borra el caso de uso (EliminarReceta).
    await this.prisma.receta.delete({ where: { id } });
  }

  async obtenerPorId(id: string): Promise<Receta | null> {
    const fila = await this.prisma.receta.findUnique({
      where: { id },
      include: INCLUIR,
    });
    return fila ? this.mapear(fila) : null;
  }

  async listar(filtro?: FiltroRecetas): Promise<Receta[]> {
    const where: Prisma.RecetaWhereInput = {};
    if (filtro?.texto) {
      where.OR = [
        { nombre: { contains: filtro.texto, mode: "insensitive" } },
        { descripcion: { contains: filtro.texto, mode: "insensitive" } },
      ];
    }
    if (filtro?.etiqueta) {
      where.etiquetas = { has: filtro.etiqueta };
    }
    const filas = await this.prisma.receta.findMany({
      where,
      include: INCLUIR,
      orderBy: { nombre: "asc" },
    });
    return filas.map((fila) => this.mapear(fila));
  }

  async asignarAPaciente(recetaId: string, pacienteId: string, id: string): Promise<void> {
    await this.prisma.asignacionReceta.upsert({
      where: { recetaId_pacienteId: { recetaId, pacienteId } },
      create: { id, recetaId, pacienteId },
      update: {},
    });
  }

  async desasignarDePaciente(recetaId: string, pacienteId: string): Promise<void> {
    await this.prisma.asignacionReceta.deleteMany({ where: { recetaId, pacienteId } });
  }

  async listarPorPaciente(pacienteId: string): Promise<Receta[]> {
    const filas = await this.prisma.receta.findMany({
      where: { asignaciones: { some: { pacienteId } } },
      include: INCLUIR,
      orderBy: { nombre: "asc" },
    });
    return filas.map((fila) => this.mapear(fila));
  }

  async listarPacientesAsignados(recetaId: string): Promise<string[]> {
    const filas = await this.prisma.asignacionReceta.findMany({
      where: { recetaId },
      select: { pacienteId: true },
    });
    return filas.map((f) => f.pacienteId);
  }

  /** Vincula archivos ya subidos a la receta (fija su recetaId). */
  private async vincularFotos(
    tx: Prisma.TransactionClient,
    recetaId: string,
    fotoIds: string[],
  ): Promise<void> {
    if (fotoIds.length > 0) {
      await tx.archivo.updateMany({
        where: { id: { in: fotoIds } },
        data: { recetaId },
      });
    }
  }

  private mapear(fila: RecetaConDetalle): Receta {
    return Receta.reconstruir({
      id: fila.id,
      nombre: fila.nombre,
      descripcion: fila.descripcion,
      porciones: fila.porciones,
      preparacion: fila.preparacion,
      ingredientes: fila.ingredientes.map((ing) => ({
        nombre: ing.nombre,
        cantidadGramos: aNumero(ing.cantidadGramos),
        caloriasPor100: aNumero(ing.caloriasPor100),
        proteinasPor100: aNumero(ing.proteinasPor100),
        carbohidratosPor100: aNumero(ing.carbohidratosPor100),
        grasasPor100: aNumero(ing.grasasPor100),
        fuente: ing.fuente,
        referenciaExterna: ing.referenciaExterna,
      })),
      etiquetas: fila.etiquetas,
      calorias: fila.calorias,
      proteinasG: aNumero(fila.proteinasG),
      carbohidratosG: aNumero(fila.carbohidratosG),
      grasasG: aNumero(fila.grasasG),
      fotos: fila.fotos.map((foto) => ({
        id: foto.id,
        nombreOriginal: foto.nombreOriginal,
        mimeType: foto.mimeType,
      })),
      creadoEn: fila.creadoEn,
      actualizadoEn: fila.actualizadoEn,
    });
  }
}
