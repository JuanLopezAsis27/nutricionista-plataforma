import type { PrismaClient } from "@prisma/client";
import type {
  IAlimentoPropioRepositorio,
  FiltroAlimentosPropios,
} from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import type { AlimentoPropio } from "@/dominio/entidades/AlimentoPropio";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";
import {
  datosDeAlimento,
  columnaCategoriaPropia,
  mapearFilaAlimento,
  dondeAlimentoPropio,
  INCLUIR_CATEGORIAS_PROPIO,
} from "./base/filasAlimento";

/** Las columnas de un alimento del consultorio, con su categoría propia. */
function filaDeAlimento(alimento: AlimentoPropio) {
  return { ...datosDeAlimento(alimento), ...columnaCategoriaPropia(alimento) };
}

const TAMANO_LOTE = 500; // filas por INSERT (evita el límite de parámetros de PG)

/**
 * Repositorio Prisma de alimentos propios. Tenant-scoped por la extensión
 * (agrega `nutricionistaId` en escrituras y filtra en lecturas). `reemplazarTodos`
 * borra la lista del inquilino e inserta la nueva de forma atómica; `crear`,
 * `actualizar` y `eliminar` son la gestión manual de un alimento individual.
 *
 * No hereda de `RepositorioPrismaBase`: cada lectura trae el nombre de su
 * categoría (`include`, migración 93), y el `findUnique` de la base devuelve
 * la fila pelada.
 */
export class PrismaRepositorioAlimentoPropio implements IAlimentoPropioRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async obtenerPorId(id: string): Promise<AlimentoPropio | null> {
    const fila = await this.prisma.alimentoPropio.findUnique({
      where: { id },
      include: INCLUIR_CATEGORIAS_PROPIO,
    });
    return fila ? mapearFilaAlimento(fila) : null;
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.alimentoPropio.delete({ where: { id } });
  }

  async reemplazarTodos(alimentos: AlimentoPropio[]): Promise<number> {
    const filas = alimentos.map(filaDeAlimento);
    const lotes: (typeof filas)[] = [];
    for (let i = 0; i < filas.length; i += TAMANO_LOTE) {
      lotes.push(filas.slice(i, i + TAMANO_LOTE));
    }

    await this.prisma.$transaction([
      this.prisma.alimentoPropio.deleteMany({}),
      ...lotes.map((lote) =>
        this.prisma.alimentoPropio.createMany({
          data: lote.map((f) => ({ ...f, nutricionistaId: inquilinoActual() })),
        }),
      ),
    ]);
    return filas.length;
  }

  async agregarVarios(alimentos: AlimentoPropio[]): Promise<number> {
    const filas = alimentos.map(filaDeAlimento);
    const lotes: (typeof filas)[] = [];
    for (let i = 0; i < filas.length; i += TAMANO_LOTE) {
      lotes.push(filas.slice(i, i + TAMANO_LOTE));
    }
    // `skipDuplicates` (ON CONFLICT DO NOTHING) contra el único
    // (nutricionistaId, claveIdentidad): el caso de uso ya descartó los que
    // estaban, esto cubre dos importaciones al mismo tiempo.
    const resultados = await this.prisma.$transaction(
      lotes.map((lote) =>
        this.prisma.alimentoPropio.createMany({
          data: lote.map((f) => ({ ...f, nutricionistaId: inquilinoActual() })),
          skipDuplicates: true,
        }),
      ),
    );
    return resultados.reduce((total, r) => total + r.count, 0);
  }

  async crear(alimento: AlimentoPropio): Promise<AlimentoPropio> {
    const fila = await this.prisma.alimentoPropio.create({
      data: {
        ...filaDeAlimento(alimento),
        nutricionistaId: inquilinoActual(),
      },
      include: INCLUIR_CATEGORIAS_PROPIO,
    });
    return mapearFilaAlimento(fila);
  }

  async actualizar(alimento: AlimentoPropio): Promise<AlimentoPropio> {
    const { id, ...datos } = filaDeAlimento(alimento);
    const fila = await this.prisma.alimentoPropio.update({
      where: { id },
      data: datos,
      include: INCLUIR_CATEGORIAS_PROPIO,
    });
    return mapearFilaAlimento(fila);
  }

  async obtenerPorClave(clave: string): Promise<AlimentoPropio | null> {
    // Único por consultorio: el filtro de inquilino de la extensión lo acota.
    const fila = await this.prisma.alimentoPropio.findFirst({
      where: { claveIdentidad: clave },
      include: INCLUIR_CATEGORIAS_PROPIO,
    });
    return fila ? mapearFilaAlimento(fila) : null;
  }

  async clavesExistentes(claves: string[]): Promise<string[]> {
    const existentes: string[] = [];
    // De a lotes: una planilla puede traer miles, y un IN enorme pasa el
    // límite de parámetros de Postgres.
    for (let i = 0; i < claves.length; i += TAMANO_LOTE) {
      const filas = await this.prisma.alimentoPropio.findMany({
        where: { claveIdentidad: { in: claves.slice(i, i + TAMANO_LOTE) } },
        select: { claveIdentidad: true },
      });
      existentes.push(...filas.map((f) => f.claveIdentidad));
    }
    return existentes;
  }

  async listar(filtro?: FiltroAlimentosPropios): Promise<AlimentoPropio[]> {
    const filas = await this.prisma.alimentoPropio.findMany({
      where: dondeAlimentoPropio(filtro),
      include: INCLUIR_CATEGORIAS_PROPIO,
      orderBy: { nombreNormalizado: "asc" },
      take: filtro?.limite,
      skip: filtro?.desplazamiento,
    });
    return filas.map(mapearFilaAlimento);
  }

  async buscar(
    termino: string,
    limite: number,
    categoriaId?: string,
  ): Promise<AlimentoPropio[]> {
    // Sin término ni categoría es hojear: los primeros `limite` por nombre.
    return this.listar({ busqueda: termino, categoriaId, limite });
  }

  contar(filtro?: FiltroAlimentosPropios): Promise<number> {
    return this.prisma.alimentoPropio.count({
      where: dondeAlimentoPropio(filtro),
    });
  }

  async vaciar(): Promise<void> {
    await this.prisma.alimentoPropio.deleteMany({});
  }

  async listarClavesDeImagen(): Promise<string[]> {
    const filas = await this.prisma.alimentoPropio.findMany({
      where: { imagenClave: { not: null } },
      select: { imagenClave: true },
    });
    return filas.flatMap((f) => (f.imagenClave ? [f.imagenClave] : []));
  }
}
