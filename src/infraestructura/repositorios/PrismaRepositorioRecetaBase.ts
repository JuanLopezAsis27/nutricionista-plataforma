import type { PrismaClient, Prisma } from "@prisma/client";
import type {
  IRecetaBaseRepositorio,
  FiltroRecetasBase,
} from "@/dominio/repositorios/IRecetaBaseRepositorio";
import { Receta, type IngredienteDeReceta } from "@/dominio/entidades/Receta";

type RecetaBaseConIngredientes = Prisma.RecetaBaseGetPayload<{
  include: { ingredientes: true };
}>;

const INCLUIR = {
  ingredientes: { orderBy: { orden: "asc" } },
} satisfies Prisma.RecetaBaseInclude;

/** Decimal (o null) → number (o null). El Decimal nunca cruza a capas altas. */
function aNumero(valor: Prisma.Decimal | null): number | null {
  return valor === null ? null : Number(valor);
}

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
    alimentoOrigenId: ing.alimentoOrigenId,
    orden,
  };
}

/**
 * Implementación con Prisma de las recetas de la plataforma. Sin inquilino:
 * `recetas_base` no está en MODELOS_INQUILINO y la extensión no la filtra.
 * Las escribe solo el SUPERADMIN (lo garantiza el procedimiento del router).
 */
export class PrismaRepositorioRecetaBase implements IRecetaBaseRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(receta: Receta): Promise<Receta> {
    const d = receta.aPrimitivos();
    const fila = await this.prisma.recetaBase.create({
      data: {
        id: d.id,
        ...escalares(d),
        creadoEn: d.creadoEn,
        ingredientes: { create: d.ingredientes.map(datosIngrediente) },
      },
      include: INCLUIR,
    });
    return mapearRecetaBase(fila);
  }

  async actualizar(receta: Receta): Promise<Receta> {
    const d = receta.aPrimitivos();
    const fila = await this.prisma.recetaBase.update({
      where: { id: d.id },
      data: {
        ...escalares(d),
        // Reemplaza la lista completa de ingredientes (agregado).
        ingredientes: {
          deleteMany: {},
          create: d.ingredientes.map(datosIngrediente),
        },
      },
      include: INCLUIR,
    });
    return mapearRecetaBase(fila);
  }

  async eliminar(id: string): Promise<void> {
    // Las copias en los recetarios quedan: su FK es SET NULL.
    await this.prisma.recetaBase.delete({ where: { id } });
  }

  async obtenerPorId(id: string): Promise<Receta | null> {
    const fila = await this.prisma.recetaBase.findUnique({
      where: { id },
      include: INCLUIR,
    });
    return fila ? mapearRecetaBase(fila) : null;
  }

  async listar(filtro?: FiltroRecetasBase): Promise<Receta[]> {
    const filas = await this.prisma.recetaBase.findMany({
      where: construirWhere(filtro),
      include: INCLUIR,
      orderBy: { nombre: "asc" },
      skip: filtro?.desplazamiento,
      take: filtro?.limite,
    });
    return filas.map(mapearRecetaBase);
  }

  contar(filtro?: FiltroRecetasBase): Promise<number> {
    return this.prisma.recetaBase.count({ where: construirWhere(filtro) });
  }

  async listarEtiquetas(): Promise<string[]> {
    // `recetas_base` no es tabla de inquilino: la consulta cruda no necesita
    // filtro de consultorio (y no lo tendría: la extensión no ve $queryRaw).
    const filas = await this.prisma.$queryRaw<{ etiqueta: string }[]>`
      SELECT DISTINCT unnest("etiquetas") AS etiqueta
      FROM "recetas_base"
      ORDER BY etiqueta
    `;
    return filas.map((f) => f.etiqueta);
  }
}

function escalares(d: ReturnType<Receta["aPrimitivos"]>) {
  return {
    nombre: d.nombre,
    descripcion: d.descripcion,
    porciones: d.porciones,
    preparacion: d.preparacion,
    etiquetas: d.etiquetas,
    enlaces: d.enlaces,
    calorias: d.calorias,
    proteinasG: d.proteinasG,
    carbohidratosG: d.carbohidratosG,
    grasasG: d.grasasG,
  };
}

function construirWhere(
  filtro?: FiltroRecetasBase,
): Prisma.RecetaBaseWhereInput {
  return {
    ...(filtro?.texto
      ? {
          OR: [
            { nombre: { contains: filtro.texto, mode: "insensitive" } },
            { descripcion: { contains: filtro.texto, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(filtro?.etiqueta ? { etiquetas: { has: filtro.etiqueta } } : {}),
  };
}

function mapearRecetaBase(fila: RecetaBaseConIngredientes): Receta {
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
      alimentoOrigenId: ing.alimentoOrigenId,
    })),
    etiquetas: fila.etiquetas,
    enlaces: fila.enlaces,
    calorias: aNumero(fila.calorias),
    proteinasG: aNumero(fila.proteinasG),
    carbohidratosG: aNumero(fila.carbohidratosG),
    grasasG: aNumero(fila.grasasG),
    // Lo que es de un consultorio no existe en el catálogo.
    fotos: [],
    fotoPrincipalId: null,
    documentos: [],
    grupoId: null,
    grupoNombre: null,
    recetaBaseId: null,
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
  });
}
