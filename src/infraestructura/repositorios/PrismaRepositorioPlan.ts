import type {
  PrismaClient,
  Prisma,
  AsignacionPlan as AsignacionFila,
} from "@prisma/client";
import type {
  IPlanRepositorio,
  AsignacionPlan,
  FiltroPlanes,
} from "@/dominio/repositorios/IPlanRepositorio";
import {
  PlanNutricional,
  type TipoRecomendacionPlan,
} from "@/dominio/entidades/PlanNutricional";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/** Include estándar: franjas ordenadas con opciones (y nombre de receta), extras. */
const INCLUIR_HIJOS = {
  comidas: {
    orderBy: { orden: "asc" },
    include: {
      opciones: {
        orderBy: { orden: "asc" },
        include: {
          receta: {
            select: {
              nombre: true,
              calorias: true,
              proteinasG: true,
              carbohidratosG: true,
              grasasG: true,
            },
          },
        },
      },
    },
  },
  equivalencias: { orderBy: { orden: "asc" } },
  recomendaciones: { orderBy: { orden: "asc" } },
} satisfies Prisma.PlanNutricionalInclude;

type PlanConHijos = Prisma.PlanNutricionalGetPayload<{ include: typeof INCLUIR_HIJOS }>;

/** Decimal (o null) → number (o null). El Decimal nunca cruza a capas altas. */
function aNumero(valor: Prisma.Decimal | null): number | null {
  return valor === null ? null : Number(valor);
}

/**
 * Implementación con Prisma del repositorio de Planes Nutricionales.
 * Persiste el agregado completo de forma atómica ($transaction); `actualizar`
 * reemplaza los hijos. Convierte Decimal↔number y gestiona las asignaciones.
 */
export class PrismaRepositorioPlan implements IPlanRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(plan: PlanNutricional): Promise<PlanNutricional> {
    const d = plan.aPrimitivos();
    // Las hijas del agregado llevan el inquilino materializado (migración 27).
    const inquilino = inquilinoActual();
    const fila = await this.prisma.planNutricional.create({
      data: {
        nutricionistaId: inquilinoActual(),
        id: d.id,
        nombre: d.nombre,
        descripcion: d.descripcion,
        esPlantilla: d.esPlantilla,
        planOrigenId: d.planOrigenId,
        archivado: d.archivado,
        caloriasMeta: d.caloriasMeta,
        proteinasMetaG: d.proteinasMetaG,
        carbohidratosMetaG: d.carbohidratosMetaG,
        grasasMetaG: d.grasasMetaG,
        contactosUtiles: d.contactosUtiles,
        creadoEn: d.creadoEn,
        actualizadoEn: d.actualizadoEn,
        comidas: {
          create: d.comidas.map((comida) => ({
            id: comida.id,
            nutricionistaId: inquilino,
            nombre: comida.nombre,
            horaDesde: comida.horaDesde,
            horaHasta: comida.horaHasta,
            orden: comida.orden,
            opciones: {
              create: comida.opciones.map((opcion) => ({
                id: opcion.id,
                nutricionistaId: inquilino,
                numero: opcion.numero,
                contenido: opcion.contenido,
                recetaId: opcion.recetaId,
                orden: opcion.orden,
              })),
            },
          })),
        },
        equivalencias: {
          create: d.equivalencias.map((equivalencia) => ({
            id: equivalencia.id,
            nutricionistaId: inquilino,
            titulo: equivalencia.titulo,
            detalle: equivalencia.detalle,
            orden: equivalencia.orden,
          })),
        },
        recomendaciones: {
          create: d.recomendaciones.map((recomendacion) => ({
            id: recomendacion.id,
            nutricionistaId: inquilino,
            tipo: recomendacion.tipo,
            texto: recomendacion.texto,
            orden: recomendacion.orden,
          })),
        },
      },
      include: INCLUIR_HIJOS,
    });
    return this.mapear(fila);
  }

  async actualizar(plan: PlanNutricional): Promise<PlanNutricional> {
    const d = plan.aPrimitivos();
    // Las hijas del agregado llevan el inquilino materializado (migración 27).
    const inquilino = inquilinoActual();
    // Reemplaza el conjunto de hijos: borra los viejos y crea los nuevos
    // (las opciones caen en cascada con sus comidas).
    const fila = await this.prisma.$transaction(async (tx) => {
      await tx.comidaPlan.deleteMany({ where: { planId: d.id } });
      await tx.equivalenciaPlan.deleteMany({ where: { planId: d.id } });
      await tx.recomendacionPlan.deleteMany({ where: { planId: d.id } });
      return tx.planNutricional.update({
        where: { id: d.id },
        data: {
          nombre: d.nombre,
          descripcion: d.descripcion,
          caloriasMeta: d.caloriasMeta,
          proteinasMetaG: d.proteinasMetaG,
          carbohidratosMetaG: d.carbohidratosMetaG,
          grasasMetaG: d.grasasMetaG,
          contactosUtiles: d.contactosUtiles,
          comidas: {
            create: d.comidas.map((comida) => ({
              id: comida.id,
              nutricionistaId: inquilino,
              nombre: comida.nombre,
              horaDesde: comida.horaDesde,
              horaHasta: comida.horaHasta,
              orden: comida.orden,
              opciones: {
                create: comida.opciones.map((opcion) => ({
                  id: opcion.id,
                  nutricionistaId: inquilino,
                  numero: opcion.numero,
                  contenido: opcion.contenido,
                  recetaId: opcion.recetaId,
                  orden: opcion.orden,
                })),
              },
            })),
          },
          equivalencias: {
            create: d.equivalencias.map((equivalencia) => ({
              id: equivalencia.id,
              nutricionistaId: inquilino,
              titulo: equivalencia.titulo,
              detalle: equivalencia.detalle,
              orden: equivalencia.orden,
            })),
          },
          recomendaciones: {
            create: d.recomendaciones.map((recomendacion) => ({
              id: recomendacion.id,
              nutricionistaId: inquilino,
              tipo: recomendacion.tipo,
              texto: recomendacion.texto,
              orden: recomendacion.orden,
            })),
          },
        },
        include: INCLUIR_HIJOS,
      });
    });
    return this.mapear(fila);
  }

  async eliminar(id: string): Promise<void> {
    // Hijos y asignaciones caen en cascada (ver schema.prisma).
    await this.prisma.planNutricional.delete({ where: { id } });
  }

  async obtenerPorId(id: string): Promise<PlanNutricional | null> {
    const fila = await this.prisma.planNutricional.findUnique({
      where: { id },
      include: INCLUIR_HIJOS,
    });
    return fila ? this.mapear(fila) : null;
  }

  async listar(filtro?: FiltroPlanes): Promise<PlanNutricional[]> {
    const filas = await this.prisma.planNutricional.findMany({
      where: this.construirWhere(filtro),
      include: INCLUIR_HIJOS,
      orderBy: { creadoEn: "desc" },
      skip: filtro?.desplazamiento,
      take: filtro?.limite,
    });
    return filas.map((fila) => this.mapear(fila));
  }

  contar(filtro?: FiltroPlanes): Promise<number> {
    return this.prisma.planNutricional.count({ where: this.construirWhere(filtro) });
  }

  private construirWhere(filtro?: FiltroPlanes): Prisma.PlanNutricionalWhereInput {
    const where: Prisma.PlanNutricionalWhereInput = {};
    if (filtro?.esPlantilla !== undefined) {
      where.esPlantilla = filtro.esPlantilla;
    }
    if (!filtro?.incluirArchivados) {
      where.archivado = false;
    }
    if (filtro?.texto) {
      where.nombre = { contains: filtro.texto, mode: "insensitive" };
    }
    return where;
  }

  async marcarArchivado(id: string, archivado: boolean): Promise<void> {
    await this.prisma.planNutricional.update({ where: { id }, data: { archivado } });
  }

  async contarAsignacionesActivasDePlan(planId: string): Promise<number> {
    return this.prisma.asignacionPlan.count({ where: { planId, activa: true } });
  }

  async asignarAPaciente(asignacion: AsignacionPlan): Promise<AsignacionPlan> {
    const fila = await this.prisma.asignacionPlan.create({
      data: {
        nutricionistaId: inquilinoActual(),
        id: asignacion.id,
        planId: asignacion.planId,
        pacienteId: asignacion.pacienteId,
        fechaInicio: this.soloFecha(asignacion.fechaInicio),
        fechaFin: asignacion.fechaFin ? this.soloFecha(asignacion.fechaFin) : null,
        activa: asignacion.activa,
      },
    });
    return this.mapearAsignacion(fila);
  }

  async desactivarAsignacionesDe(pacienteId: string): Promise<void> {
    await this.prisma.asignacionPlan.updateMany({
      where: { pacienteId, activa: true },
      data: { activa: false },
    });
  }

  async obtenerAsignacionActiva(pacienteId: string): Promise<AsignacionPlan | null> {
    const fila = await this.prisma.asignacionPlan.findFirst({
      where: { pacienteId, activa: true },
    });
    return fila ? this.mapearAsignacion(fila) : null;
  }

  async obtenerPlanActivoDePaciente(pacienteId: string): Promise<PlanNutricional | null> {
    const asignacion = await this.prisma.asignacionPlan.findFirst({
      where: { pacienteId, activa: true },
      include: { plan: { include: INCLUIR_HIJOS } },
    });
    return asignacion ? this.mapear(asignacion.plan) : null;
  }

  async listarAsignacionesActivasVencidas(fechaLimite: Date): Promise<AsignacionPlan[]> {
    const filas = await this.prisma.asignacionPlan.findMany({
      where: { activa: true, fechaFin: { not: null, lt: this.soloFecha(fechaLimite) } },
    });
    return filas.map((fila) => this.mapearAsignacion(fila));
  }

  private soloFecha(fecha: Date): Date {
    return new Date(
      Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()),
    );
  }

  private mapear(fila: PlanConHijos): PlanNutricional {
    return PlanNutricional.reconstruir({
      id: fila.id,
      nombre: fila.nombre,
      descripcion: fila.descripcion,
      esPlantilla: fila.esPlantilla,
      planOrigenId: fila.planOrigenId,
      archivado: fila.archivado,
      caloriasMeta: fila.caloriasMeta,
      proteinasMetaG: aNumero(fila.proteinasMetaG),
      carbohidratosMetaG: aNumero(fila.carbohidratosMetaG),
      grasasMetaG: aNumero(fila.grasasMetaG),
      contactosUtiles: fila.contactosUtiles,
      comidas: fila.comidas.map((comida) => ({
        id: comida.id,
        nombre: comida.nombre,
        horaDesde: comida.horaDesde,
        horaHasta: comida.horaHasta,
        orden: comida.orden,
        opciones: comida.opciones.map((opcion) => ({
          id: opcion.id,
          numero: opcion.numero,
          contenido: opcion.contenido,
          recetaId: opcion.recetaId,
          recetaNombre: opcion.receta?.nombre ?? null,
          recetaMacros: opcion.receta
            ? {
                calorias: aNumero(opcion.receta.calorias),
                proteinasG: aNumero(opcion.receta.proteinasG),
                carbohidratosG: aNumero(opcion.receta.carbohidratosG),
                grasasG: aNumero(opcion.receta.grasasG),
              }
            : null,
          orden: opcion.orden,
        })),
      })),
      equivalencias: fila.equivalencias.map((equivalencia) => ({
        id: equivalencia.id,
        titulo: equivalencia.titulo,
        detalle: equivalencia.detalle,
        orden: equivalencia.orden,
      })),
      recomendaciones: fila.recomendaciones.map((recomendacion) => ({
        id: recomendacion.id,
        tipo: recomendacion.tipo as TipoRecomendacionPlan,
        texto: recomendacion.texto,
        orden: recomendacion.orden,
      })),
      creadoEn: fila.creadoEn,
      actualizadoEn: fila.actualizadoEn,
    });
  }

  private mapearAsignacion(fila: AsignacionFila): AsignacionPlan {
    return {
      id: fila.id,
      planId: fila.planId,
      pacienteId: fila.pacienteId,
      fechaInicio: fila.fechaInicio,
      fechaFin: fila.fechaFin,
      activa: fila.activa,
    };
  }
}
