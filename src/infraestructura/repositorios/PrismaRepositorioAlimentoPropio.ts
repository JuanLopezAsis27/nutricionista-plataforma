import type {
  PrismaClient,
  AlimentoPropio as AlimentoPropioFila,
} from "@prisma/client";
import type {
  IAlimentoPropioRepositorio,
  FiltroAlimentosPropios,
} from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import type {
  AlimentoPropio,
  CategoriaAlimento,
} from "@/dominio/entidades/AlimentoPropio";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";
import { RepositorioPrismaBase } from "./base/RepositorioPrismaBase";
import {
  datosDeAlimento,
  mapearFilaAlimento,
  dondeAlimento,
} from "./base/filasAlimento";

const TAMANO_LOTE = 500; // filas por INSERT (evita el límite de parámetros de PG)

/**
 * Repositorio Prisma de alimentos propios. Tenant-scoped por la extensión
 * (agrega `nutricionistaId` en escrituras y filtra en lecturas). `reemplazarTodos`
 * borra la lista del inquilino e inserta la nueva de forma atómica; `crear`,
 * `actualizar` y `eliminar` son la gestión manual de un alimento individual.
 */
export class PrismaRepositorioAlimentoPropio
  extends RepositorioPrismaBase<AlimentoPropioFila, AlimentoPropio>
  implements IAlimentoPropioRepositorio
{
  constructor(private readonly prisma: PrismaClient) {
    super(prisma.alimentoPropio);
  }

  async reemplazarTodos(alimentos: AlimentoPropio[]): Promise<number> {
    const filas = alimentos.map(datosDeAlimento);
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

  async crear(alimento: AlimentoPropio): Promise<AlimentoPropio> {
    const fila = await this.prisma.alimentoPropio.create({
      data: {
        ...datosDeAlimento(alimento),
        nutricionistaId: inquilinoActual(),
      },
    });
    return mapearFilaAlimento(fila);
  }

  async actualizar(alimento: AlimentoPropio): Promise<AlimentoPropio> {
    const { id, ...datos } = datosDeAlimento(alimento);
    const fila = await this.prisma.alimentoPropio.update({
      where: { id },
      data: datos,
    });
    return mapearFilaAlimento(fila);
  }

  async obtenerPorClave(clave: string): Promise<AlimentoPropio | null> {
    // Único por consultorio: el filtro de inquilino de la extensión lo acota.
    const fila = await this.prisma.alimentoPropio.findFirst({
      where: { claveIdentidad: clave },
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
      where: dondeAlimento(filtro),
      orderBy: { nombreNormalizado: "asc" },
      take: filtro?.limite,
      skip: filtro?.desplazamiento,
    });
    return this.mapearTodas(filas);
  }

  async buscar(
    termino: string,
    limite: number,
    categoria?: CategoriaAlimento,
  ): Promise<AlimentoPropio[]> {
    if (termino.trim().length === 0 && !categoria) return [];
    return this.listar({ busqueda: termino, categoria, limite });
  }

  contar(filtro?: FiltroAlimentosPropios): Promise<number> {
    return this.prisma.alimentoPropio.count({ where: dondeAlimento(filtro) });
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

  protected override mapear(fila: AlimentoPropioFila): AlimentoPropio {
    return mapearFilaAlimento(fila);
  }
}
