import type { PrismaClient, Prisma } from "@prisma/client";
import type {
  IPlanificacionDeportivaRepositorio,
  FiltroPlanificaciones,
} from "@/dominio/repositorios/IPlanificacionDeportivaRepositorio";
import type {
  IAsignacionPlanificacionRepositorio,
  AsignacionPlanificacion,
  AsignacionConPlanificacion,
  AsignacionConPaciente,
  CompetenciaDeAsignacion,
} from "@/dominio/repositorios/IAsignacionPlanificacionRepositorio";
import {
  PlanificacionDeportiva,
  type DetalleCarrera,
  type PropiedadesPlanificacionDeportiva,
} from "@/dominio/entidades/PlanificacionDeportiva";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";
import { cantidadDeFila, columnasDeCantidad } from "./base/medidasJson";
import { enVersion, guardandoVersion } from "./base/edicionConcurrente";

/**
 * Include estándar: los datos de la carrera y las ingestas en orden de
 * tiempo, con sus alimentos. El orden no es decorativo: es la línea de tiempo
 * que lee el paciente.
 */
const INCLUIR_HIJOS = {
  carrera: true,
  ingestas: {
    orderBy: [{ minuto: "asc" }, { orden: "asc" }],
    include: { alimentos: { orderBy: { orden: "asc" } } },
  },
} satisfies Prisma.PlanificacionDeportivaInclude;

type PlanificacionConHijos = Prisma.PlanificacionDeportivaGetPayload<{
  include: typeof INCLUIR_HIJOS;
}>;

const SELECCION_COMPETENCIA = {
  select: { id: true, nombre: true, fecha: true, lugar: true },
} as const;

/** Decimal (o null) → number (o null). El Decimal nunca cruza a capas altas. */
function aNumero(valor: Prisma.Decimal | null): number | null {
  return valor === null ? null : Number(valor);
}

/**
 * Implementación con Prisma de las planificaciones deportivas (migración 94)
 * y de sus asignaciones: una implementación, dos contratos, como el plan
 * semanal. El cableado inyecta la misma instancia donde haga falta.
 *
 * `actualizar` reemplaza los hijos dentro de UNA transacción: borra los datos
 * de la carrera y las ingestas (los alimentos caen en cascada) y los vuelve a
 * crear. Sueltos, un fallo a mitad de camino dejaría una carrera sin ingestas.
 */
export class PrismaRepositorioPlanificacionDeportiva
  implements
    IPlanificacionDeportivaRepositorio,
    IAsignacionPlanificacionRepositorio
{
  constructor(private readonly prisma: PrismaClient) {}

  async crear(
    planificacion: PlanificacionDeportiva,
  ): Promise<PlanificacionDeportiva> {
    const d = planificacion.aPrimitivos();
    const inquilino = inquilinoActual();
    const fila = await this.prisma.planificacionDeportiva.create({
      data: {
        nutricionistaId: inquilino,
        id: d.id,
        nombre: d.nombre,
        descripcion: d.descripcion,
        pesoReferenciaKg: d.pesoReferenciaKg,
        tipo: d.tipo,
        grupoId: d.grupoId,
        creadoEn: d.creadoEn,
        actualizadoEn: d.actualizadoEn,
        ...(d.carrera
          ? { carrera: { create: carreraParaPrisma(d.carrera, inquilino) } }
          : {}),
        ingestas: { create: ingestasParaPrisma(d, inquilino) },
      },
      include: INCLUIR_HIJOS,
    });
    return mapearPlanificacion(fila);
  }

  async actualizar(
    planificacion: PlanificacionDeportiva,
    esperadoEn?: Date,
  ): Promise<PlanificacionDeportiva> {
    const d = planificacion.aPrimitivos();
    const inquilino = inquilinoActual();
    // Los borrados van ANTES del update que lleva la guardia de versión: un
    // conflicto los encuentra hechos y lo que los deshace es el rollback de
    // la transacción. Sueltos, un choque dejaría la carrera sin ingestas.
    const fila = await guardandoVersion("La planificación", esperadoEn, () =>
      this.prisma.$transaction(async (tx) => {
        await tx.ingestaPlanificacion.deleteMany({
          where: { planificacionId: d.id },
        });
        await tx.planificacionCarrera.deleteMany({
          where: { planificacionId: d.id },
        });
        return tx.planificacionDeportiva.update({
          where: enVersion(d.id, esperadoEn),
          data: {
            nombre: d.nombre,
            descripcion: d.descripcion,
            pesoReferenciaKg: d.pesoReferenciaKg,
            // En el `create` también: un campo que va en uno solo pierde contra
            // el default de la base sin ningún error.
            ...(d.carrera
              ? { carrera: { create: carreraParaPrisma(d.carrera, inquilino) } }
              : {}),
            ingestas: { create: ingestasParaPrisma(d, inquilino) },
          },
          include: INCLUIR_HIJOS,
        });
      }),
    );
    return mapearPlanificacion(fila);
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.planificacionDeportiva.delete({ where: { id } });
  }

  async obtenerPorId(id: string): Promise<PlanificacionDeportiva | null> {
    const fila = await this.prisma.planificacionDeportiva.findUnique({
      where: { id },
      include: INCLUIR_HIJOS,
    });
    return fila ? mapearPlanificacion(fila) : null;
  }

  async listar(
    filtro?: FiltroPlanificaciones,
  ): Promise<PlanificacionDeportiva[]> {
    const filas = await this.prisma.planificacionDeportiva.findMany({
      where: dondePlanificacion(filtro),
      include: INCLUIR_HIJOS,
      orderBy: { nombre: "asc" },
      skip: filtro?.desplazamiento,
      take: filtro?.limite,
    });
    return filas.map(mapearPlanificacion);
  }

  contar(filtro?: FiltroPlanificaciones): Promise<number> {
    return this.prisma.planificacionDeportiva.count({
      where: dondePlanificacion(filtro),
    });
  }

  async existeNombre(nombre: string, excluirId?: string): Promise<boolean> {
    // Más estricto que el índice único, que distingue mayúsculas: «Maratón»
    // y «maratón» son la misma para quien mira la lista.
    const cantidad = await this.prisma.planificacionDeportiva.count({
      where: {
        nombre: { equals: nombre, mode: "insensitive" },
        ...(excluirId ? { NOT: { id: excluirId } } : {}),
      },
    });
    return cantidad > 0;
  }

  async moverAGrupo(id: string, grupoId: string | null): Promise<void> {
    await this.prisma.planificacionDeportiva.update({
      where: { id },
      data: { grupoId },
    });
  }

  // --- Asignaciones ---------------------------------------------------------

  async asignar(
    asignacion: AsignacionPlanificacion,
  ): Promise<AsignacionPlanificacion> {
    const fila = await this.prisma.asignacionPlanificacion.upsert({
      where: {
        planificacionId_pacienteId: {
          planificacionId: asignacion.planificacionId,
          pacienteId: asignacion.pacienteId,
        },
      },
      create: {
        nutricionistaId: inquilinoActual(),
        id: asignacion.id,
        planificacionId: asignacion.planificacionId,
        pacienteId: asignacion.pacienteId,
        competenciaId: asignacion.competenciaId,
        creadoEn: asignacion.creadoEn,
      },
      update: { competenciaId: asignacion.competenciaId },
    });
    return mapearAsignacion(fila);
  }

  async desasignar(planificacionId: string, pacienteId: string): Promise<void> {
    await this.prisma.asignacionPlanificacion.deleteMany({
      where: { planificacionId, pacienteId },
    });
  }

  async obtenerAsignacion(
    planificacionId: string,
    pacienteId: string,
  ): Promise<AsignacionPlanificacion | null> {
    const fila = await this.prisma.asignacionPlanificacion.findFirst({
      where: { planificacionId, pacienteId },
    });
    return fila ? mapearAsignacion(fila) : null;
  }

  async listarDePaciente(
    pacienteId: string,
  ): Promise<AsignacionConPlanificacion[]> {
    const filas = await this.prisma.asignacionPlanificacion.findMany({
      where: { pacienteId },
      include: {
        planificacion: { include: INCLUIR_HIJOS },
        competencia: SELECCION_COMPETENCIA,
      },
      orderBy: { creadoEn: "desc" },
    });
    return filas
      .map((fila) => ({
        ...mapearAsignacion(fila),
        planificacion: mapearPlanificacion(fila.planificacion),
        competencia: competenciaDeFila(fila.competencia),
      }))
      .sort(porCompetencia);
  }

  contarDePaciente(pacienteId: string): Promise<number> {
    return this.prisma.asignacionPlanificacion.count({ where: { pacienteId } });
  }

  async listarDePlanificacion(
    planificacionId: string,
  ): Promise<AsignacionConPaciente[]> {
    const filas = await this.prisma.asignacionPlanificacion.findMany({
      where: { planificacionId },
      include: {
        paciente: { select: { nombre: true, apellido: true } },
        competencia: SELECCION_COMPETENCIA,
      },
      orderBy: [
        { paciente: { apellido: "asc" } },
        { paciente: { nombre: "asc" } },
      ],
    });
    return filas.map((fila) => ({
      ...mapearAsignacion(fila),
      pacienteNombre: fila.paciente.nombre,
      pacienteApellido: fila.paciente.apellido,
      competencia: competenciaDeFila(fila.competencia),
    }));
  }

  async contarPacientes(
    planificacionIds: string[],
  ): Promise<Map<string, number>> {
    if (planificacionIds.length === 0) return new Map();
    const conteos = await this.prisma.asignacionPlanificacion.groupBy({
      by: ["planificacionId"],
      where: { planificacionId: { in: planificacionIds } },
      _count: { _all: true },
    });
    return new Map(conteos.map((c) => [c.planificacionId, c._count._all]));
  }
}

/** La de la competencia más próxima primero; las que no tienen competencia, al final. */
function porCompetencia(
  a: AsignacionConPlanificacion,
  b: AsignacionConPlanificacion,
): number {
  if (a.competencia && b.competencia) {
    return a.competencia.fecha.getTime() - b.competencia.fecha.getTime();
  }
  if (a.competencia) return -1;
  if (b.competencia) return 1;
  return b.creadoEn.getTime() - a.creadoEn.getTime();
}

function dondePlanificacion(
  filtro?: FiltroPlanificaciones,
): Prisma.PlanificacionDeportivaWhereInput {
  return {
    ...(filtro?.texto
      ? { nombre: { contains: filtro.texto, mode: "insensitive" } }
      : {}),
    ...(filtro?.grupoId !== undefined ? { grupoId: filtro.grupoId } : {}),
  };
}

function carreraParaPrisma(
  carrera: DetalleCarrera,
  inquilino: string,
): Prisma.PlanificacionCarreraUncheckedCreateWithoutPlanificacionInput {
  return { nutricionistaId: inquilino, ...carrera };
}

/**
 * Las ingestas listas para el `create` anidado. Las hijas llevan el inquilino
 * MATERIALIZADO (migración 27): sin él se llega a ellas por id directo sin
 * ningún control de inquilino.
 */
function ingestasParaPrisma(
  d: PropiedadesPlanificacionDeportiva,
  inquilino: string,
): Prisma.IngestaPlanificacionUncheckedCreateWithoutPlanificacionInput[] {
  return d.ingestas.map((ingesta) => ({
    id: ingesta.id,
    nutricionistaId: inquilino,
    minuto: ingesta.minuto,
    km: ingesta.km,
    notas: ingesta.notas,
    orden: ingesta.orden,
    alimentos: {
      create: ingesta.alimentos.map((alimento) => ({
        id: alimento.id,
        nutricionistaId: inquilino,
        nombre: alimento.nombre,
        ...columnasDeCantidad(alimento),
        caloriasPor100: alimento.caloriasPor100,
        proteinasPor100: alimento.proteinasPor100,
        carbohidratosPor100: alimento.carbohidratosPor100,
        grasasPor100: alimento.grasasPor100,
        cafeinaPor100: alimento.cafeinaPor100,
        fuente: alimento.fuente,
        referenciaExterna: alimento.referenciaExterna,
        alimentoOrigenId: alimento.alimentoOrigenId,
        orden: alimento.orden,
      })),
    },
  }));
}

export function mapearPlanificacion(
  fila: PlanificacionConHijos,
): PlanificacionDeportiva {
  const c = fila.carrera;
  return PlanificacionDeportiva.reconstruir({
    id: fila.id,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    tipo: fila.tipo,
    grupoId: fila.grupoId,
    pesoReferenciaKg: aNumero(fila.pesoReferenciaKg),
    carrera: c
      ? {
          modalidad: c.modalidad,
          distanciaKm: Number(c.distanciaKm),
          duracionEstimadaMin: c.duracionEstimadaMin,
          desnivelPositivoM: c.desnivelPositivoM,
          desnivelNegativoM: c.desnivelNegativoM,
          horaLargada: c.horaLargada,
          temperaturaEstimadaC: aNumero(c.temperaturaEstimadaC),
          carbohidratosObjetivoGH: aNumero(c.carbohidratosObjetivoGH),
          liquidosObjetivoMlH: c.liquidosObjetivoMlH,
          sodioObjetivoMgH: c.sodioObjetivoMgH,
          puestosAbastecimiento: c.puestosAbastecimiento,
          estrategiaPrevia: c.estrategiaPrevia,
          recuperacion: c.recuperacion,
        }
      : null,
    ingestas: fila.ingestas.map((ingesta) => ({
      id: ingesta.id,
      minuto: ingesta.minuto,
      km: aNumero(ingesta.km),
      notas: ingesta.notas,
      orden: ingesta.orden,
      alimentos: ingesta.alimentos.map((alimento) => ({
        id: alimento.id,
        nombre: alimento.nombre,
        ...cantidadDeFila(alimento),
        caloriasPor100: aNumero(alimento.caloriasPor100),
        proteinasPor100: aNumero(alimento.proteinasPor100),
        carbohidratosPor100: aNumero(alimento.carbohidratosPor100),
        grasasPor100: aNumero(alimento.grasasPor100),
        cafeinaPor100: aNumero(alimento.cafeinaPor100),
        fuente: alimento.fuente,
        referenciaExterna: alimento.referenciaExterna,
        alimentoOrigenId: alimento.alimentoOrigenId,
        orden: alimento.orden,
      })),
    })),
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
  });
}

function mapearAsignacion(fila: {
  id: string;
  planificacionId: string;
  pacienteId: string;
  competenciaId: string | null;
  creadoEn: Date;
}): AsignacionPlanificacion {
  return {
    id: fila.id,
    planificacionId: fila.planificacionId,
    pacienteId: fila.pacienteId,
    competenciaId: fila.competenciaId,
    creadoEn: fila.creadoEn,
  };
}

function competenciaDeFila(
  fila: CompetenciaDeAsignacion | null,
): CompetenciaDeAsignacion | null {
  return fila
    ? { id: fila.id, nombre: fila.nombre, fecha: fila.fecha, lugar: fila.lugar }
    : null;
}
