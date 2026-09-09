import type {
  PrismaClient,
  Prisma,
  AlimentoPropio as AlimentoPropioFila,
} from "@prisma/client";
import type {
  IAlimentoPropioRepositorio,
  FiltroAlimentosPropios,
} from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import { AlimentoPropio } from "@/dominio/entidades/AlimentoPropio";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";
import { RepositorioPrismaBase } from "./base/RepositorioPrismaBase";

const TAMANO_LOTE = 500; // filas por INSERT (evita el límite de parámetros de PG)

/**
 * Repositorio Prisma de alimentos propios. Tenant-scoped por la extensión
 * (agrega `nutricionistaId` en escrituras y filtra en lecturas). `reemplazarTodos`
 * borra la lista del inquilino e inserta la nueva de forma atómica; `crear`,
 * `actualizar` y `eliminar` son la gestión manual de un alimento individual.
 */
/** Decimal nunca cruza infraestructura: se mapea a number. */
function aNumero(valor: Prisma.Decimal | null): number | null {
  return valor === null ? null : valor.toNumber();
}

function dondeBuscar(filtro?: FiltroAlimentosPropios) {
  const t = filtro?.busqueda?.trim().toLowerCase();
  return t ? { nombreNormalizado: { contains: t } } : {};
}

export class PrismaRepositorioAlimentoPropio
  extends RepositorioPrismaBase<AlimentoPropioFila, AlimentoPropio>
  implements IAlimentoPropioRepositorio
{
  constructor(private readonly prisma: PrismaClient) {
    super(prisma.alimentoPropio);
  }

  async reemplazarTodos(alimentos: AlimentoPropio[]): Promise<number> {
    const filas = alimentos.map((a) => {
      const p = a.aPrimitivos();
      return {
        id: p.id,
        nombre: p.nombre,
        nombreNormalizado: a.nombreNormalizado,
        marca: p.marca,
        caloriasPor100: p.caloriasPor100,
        proteinasPor100: p.proteinasPor100,
        carbohidratosPor100: p.carbohidratosPor100,
        grasasPor100: p.grasasPor100,
      };
    });

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
    const p = alimento.aPrimitivos();
    const fila = await this.prisma.alimentoPropio.create({
      data: {
        id: p.id,
        nutricionistaId: inquilinoActual(),
        nombre: p.nombre,
        nombreNormalizado: alimento.nombreNormalizado,
        marca: p.marca,
        caloriasPor100: p.caloriasPor100,
        proteinasPor100: p.proteinasPor100,
        carbohidratosPor100: p.carbohidratosPor100,
        grasasPor100: p.grasasPor100,
      },
    });
    return mapearAlimentoPropio(fila);
  }

  async actualizar(alimento: AlimentoPropio): Promise<AlimentoPropio> {
    const p = alimento.aPrimitivos();
    const fila = await this.prisma.alimentoPropio.update({
      where: { id: p.id },
      data: {
        nombre: p.nombre,
        nombreNormalizado: alimento.nombreNormalizado,
        marca: p.marca,
        caloriasPor100: p.caloriasPor100,
        proteinasPor100: p.proteinasPor100,
        carbohidratosPor100: p.carbohidratosPor100,
        grasasPor100: p.grasasPor100,
      },
    });
    return mapearAlimentoPropio(fila);
  }

  async listar(filtro?: FiltroAlimentosPropios): Promise<AlimentoPropio[]> {
    const filas = await this.prisma.alimentoPropio.findMany({
      where: dondeBuscar(filtro),
      orderBy: { nombreNormalizado: "asc" },
      take: filtro?.limite,
      skip: filtro?.desplazamiento,
    });
    return this.mapearTodas(filas);
  }

  async buscar(termino: string, limite: number): Promise<AlimentoPropio[]> {
    const t = termino.trim().toLowerCase();
    if (t.length === 0) return [];
    const filas = await this.prisma.alimentoPropio.findMany({
      where: { nombreNormalizado: { contains: t } },
      orderBy: { nombreNormalizado: "asc" },
      take: limite,
    });
    return this.mapearTodas(filas);
  }

  contar(filtro?: FiltroAlimentosPropios): Promise<number> {
    return this.prisma.alimentoPropio.count({ where: dondeBuscar(filtro) });
  }

  async vaciar(): Promise<void> {
    await this.prisma.alimentoPropio.deleteMany({});
  }

  protected override mapear(fila: AlimentoPropioFila): AlimentoPropio {
    return mapearAlimentoPropio(fila);
  }
}

function mapearAlimentoPropio(fila: AlimentoPropioFila): AlimentoPropio {
  return AlimentoPropio.reconstruir({
    id: fila.id,
    nombre: fila.nombre,
    marca: fila.marca,
    caloriasPor100: aNumero(fila.caloriasPor100),
    proteinasPor100: aNumero(fila.proteinasPor100),
    carbohidratosPor100: aNumero(fila.carbohidratosPor100),
    grasasPor100: aNumero(fila.grasasPor100),
  });
}
