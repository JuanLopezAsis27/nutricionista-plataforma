import type { PrismaClient } from "@prisma/client";
import type {
  IUsosDeAlimentoRepositorio,
  UsosDeAlimento,
} from "@/dominio/repositorios/IUsosDeAlimentoRepositorio";

/**
 * Cuenta dónde se usa un alimento por `alimentoOrigenId` (migración 85).
 *
 * Cuenta los DUEÑOS (planes, recetas, planes semanales), no las filas: un
 * plan que lleva avena en tres opciones es un plan que la usa. Las tablas de
 * inquilino las acota la extensión según el alcance: en un consultorio cuenta
 * lo suyo, con alcance global (SUPERADMIN) lo de todos.
 *
 * El id del alimento no se cruza con `fuente` porque es un UUID: el de un
 * alimento propio no puede coincidir con el de uno de la plataforma.
 */
export class PrismaRepositorioUsosDeAlimento implements IUsosDeAlimentoRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async contar(alimentoId: string): Promise<UsosDeAlimento> {
    const conOrigen = { some: { alimentoOrigenId: alimentoId } };
    const [planes, recetas, planesSemanales, recetasPlataforma, consultorios] =
      await Promise.all([
        this.prisma.planNutricional.count({
          where: {
            comidas: { some: { opciones: { some: { items: conOrigen } } } },
          },
        }),
        this.prisma.receta.count({ where: { ingredientes: conOrigen } }),
        this.prisma.planSemanal.count({
          where: {
            franjas: { some: { comidas: { some: { items: conOrigen } } } },
          },
        }),
        this.prisma.recetaBase.count({ where: { ingredientes: conOrigen } }),
        this.contarConsultorios(alimentoId),
      ]);
    return {
      planes,
      recetas,
      planesSemanales,
      recetasPlataforma,
      consultorios,
    };
  }

  /** Consultorios distintos en los que aparece alguna copia del alimento. */
  private async contarConsultorios(alimentoId: string): Promise<number> {
    const donde = { alimentoOrigenId: alimentoId };
    const seleccion = { nutricionistaId: true } as const;
    const [opciones, ingredientes, semanales] = await Promise.all([
      this.prisma.itemOpcionComida.findMany({
        where: donde,
        select: seleccion,
        distinct: ["nutricionistaId"],
      }),
      this.prisma.ingredienteReceta.findMany({
        where: donde,
        select: seleccion,
        distinct: ["nutricionistaId"],
      }),
      this.prisma.itemComidaSemanal.findMany({
        where: donde,
        select: seleccion,
        distinct: ["nutricionistaId"],
      }),
    ]);
    return new Set(
      [...opciones, ...ingredientes, ...semanales].map(
        (f) => f.nutricionistaId,
      ),
    ).size;
  }
}
