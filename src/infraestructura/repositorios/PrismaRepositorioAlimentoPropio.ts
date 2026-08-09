import type { PrismaClient } from "@prisma/client";
import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import { AlimentoPropio } from "@/dominio/entidades/AlimentoPropio";

const TAMANO_LOTE = 500; // filas por INSERT (evita el límite de parámetros de PG)

/**
 * Repositorio Prisma de alimentos propios. Tenant-scoped por la extensión
 * (agrega `nutricionistaId` en escrituras y filtra en lecturas). `reemplazarTodos`
 * borra la lista del inquilino e inserta la nueva de forma atómica.
 */
export class PrismaRepositorioAlimentoPropio implements IAlimentoPropioRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

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
      ...lotes.map((lote) => this.prisma.alimentoPropio.createMany({ data: lote })),
    ]);
    return filas.length;
  }

  async buscar(termino: string, limite: number): Promise<AlimentoPropio[]> {
    const t = termino.trim().toLowerCase();
    if (t.length === 0) return [];
    const filas = await this.prisma.alimentoPropio.findMany({
      where: { nombreNormalizado: { contains: t } },
      orderBy: { nombreNormalizado: "asc" },
      take: limite,
    });
    return filas.map((f) =>
      AlimentoPropio.reconstruir({
        id: f.id,
        nombre: f.nombre,
        marca: f.marca,
        caloriasPor100: f.caloriasPor100,
        proteinasPor100: f.proteinasPor100,
        carbohidratosPor100: f.carbohidratosPor100,
        grasasPor100: f.grasasPor100,
      }),
    );
  }

  contar(): Promise<number> {
    return this.prisma.alimentoPropio.count();
  }

  async vaciar(): Promise<void> {
    await this.prisma.alimentoPropio.deleteMany({});
  }
}
