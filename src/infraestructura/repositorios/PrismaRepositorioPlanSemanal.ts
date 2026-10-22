import type {
  PrismaClient,
  Prisma,
  AsignacionPlanSemanal as AsignacionFila,
} from "@prisma/client";
import type {
  IPlanSemanalRepositorio,
  FiltroPlanesSemanales,
} from "@/dominio/repositorios/IPlanSemanalRepositorio";
import type {
  IAsignacionPlanSemanalRepositorio,
  AsignacionPlanSemanal,
  AsignacionSemanalConPaciente,
} from "@/dominio/repositorios/IAsignacionPlanSemanalRepositorio";
import {
  PlanSemanal,
  DIAS_SEMANA,
  type DiaSemana,
  type MetasPlanSemanal,
  type ValoresMeta,
} from "@/dominio/entidades/PlanSemanal";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";
import { soloFecha } from "./base/fechas";
import { cantidadDeFila, columnasDeCantidad } from "./base/medidasJson";

/**
 * Include estándar: franjas ordenadas, con sus comidas por día y orden, los
 * alimentos de cada una y el nombre y los macros de la receta vinculada.
 *
 * El orden importa y no es decorativo: dentro de una celda, la comida que va
 * primera es la PRINCIPAL —la que suma al total del día—, así que sin
 * `orderBy` el total dependería del orden en que Postgres devolviera las filas.
 */
const INCLUIR_HIJOS = {
  // El enum se ordena como se declaró (LUNES…DOMINGO): sale en el orden de la
  // semana.
  metasDia: { orderBy: { dia: "asc" } },
  franjas: {
    orderBy: { orden: "asc" },
    include: {
      comidas: {
        orderBy: [{ dia: "asc" }, { orden: "asc" }],
        include: {
          items: { orderBy: { orden: "asc" } },
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
} satisfies Prisma.PlanSemanalInclude;

type PlanConHijos = Prisma.PlanSemanalGetPayload<{
  include: typeof INCLUIR_HIJOS;
}>;

/** Decimal (o null) → number (o null). El Decimal nunca cruza a capas altas. */
function aNumero(valor: Prisma.Decimal | null): number | null {
  return valor === null ? null : Number(valor);
}

/**
 * Implementación con Prisma del repositorio de Planes Semanales.
 *
 * Persiste el agregado completo de forma atómica; `actualizar` reemplaza los
 * hijos (borra las franjas y las metas por día y las vuelve a crear: comidas
 * e items caen y renacen con ellas por la cascada de la base).
 *
 * Sirve además el puerto de asignaciones, igual que `PrismaRepositorioPlan`:
 * una implementación puede cumplir dos contratos, y el cableado inyecta la
 * misma instancia donde haga falta.
 */
export class PrismaRepositorioPlanSemanal
  implements IPlanSemanalRepositorio, IAsignacionPlanSemanalRepositorio
{
  constructor(private readonly prisma: PrismaClient) {}

  async crear(plan: PlanSemanal): Promise<PlanSemanal> {
    const d = plan.aPrimitivos();
    const inquilino = inquilinoActual();
    const fila = await this.prisma.planSemanal.create({
      data: {
        nutricionistaId: inquilino,
        id: d.id,
        nombre: d.nombre,
        descripcion: d.descripcion,
        ...columnasDeMetas(d.metas),
        creadoEn: d.creadoEn,
        actualizadoEn: d.actualizadoEn,
        metasDia: { create: metasDiaParaPrisma(d.metas, inquilino) },
        franjas: { create: franjasParaPrisma(d, inquilino) },
      },
      include: INCLUIR_HIJOS,
    });
    return mapearPlanSemanal(fila);
  }

  async actualizar(plan: PlanSemanal): Promise<PlanSemanal> {
    const d = plan.aPrimitivos();
    const inquilino = inquilinoActual();
    const fila = await this.prisma.$transaction(async (tx) => {
      // Las comidas y sus alimentos caen con la franja (cascada de la base).
      await tx.franjaPlanSemanal.deleteMany({
        where: { planSemanalId: d.id },
      });
      // Las metas por día se reemplazan enteras, en la MISMA transacción: es
      // lo que garantiza que un plan que pasa a GENERAL no conserve filas por
      // día (la base no puede exigirlo entre dos tablas sin un trigger).
      await tx.metaDiaPlanSemanal.deleteMany({
        where: { planSemanalId: d.id },
      });
      return tx.planSemanal.update({
        where: { id: d.id },
        data: {
          nombre: d.nombre,
          descripcion: d.descripcion,
          // En el `create` también: un campo que solo va en uno de los dos
          // pierde contra el default de la base sin ningún error.
          ...columnasDeMetas(d.metas),
          metasDia: { create: metasDiaParaPrisma(d.metas, inquilino) },
          franjas: { create: franjasParaPrisma(d, inquilino) },
        },
        include: INCLUIR_HIJOS,
      });
    });
    return mapearPlanSemanal(fila);
  }

  async eliminar(id: string): Promise<void> {
    // Los hijos caen en cascada. Las ASIGNACIONES no: su FK es SET NULL y
    // quedan en el historial del paciente con el nombre que el plan tenía.
    await this.prisma.planSemanal.delete({ where: { id } });
  }

  async obtenerPorId(id: string): Promise<PlanSemanal | null> {
    const fila = await this.prisma.planSemanal.findUnique({
      where: { id },
      include: INCLUIR_HIJOS,
    });
    return fila ? mapearPlanSemanal(fila) : null;
  }

  async listar(filtro?: FiltroPlanesSemanales): Promise<PlanSemanal[]> {
    const filas = await this.prisma.planSemanal.findMany({
      where: this.construirWhere(filtro),
      include: INCLUIR_HIJOS,
      orderBy: { creadoEn: "desc" },
      skip: filtro?.desplazamiento,
      take: filtro?.limite,
    });
    return filas.map((fila) => mapearPlanSemanal(fila));
  }

  contar(filtro?: FiltroPlanesSemanales): Promise<number> {
    return this.prisma.planSemanal.count({
      where: this.construirWhere(filtro),
    });
  }

  private construirWhere(
    filtro?: FiltroPlanesSemanales,
  ): Prisma.PlanSemanalWhereInput {
    const where: Prisma.PlanSemanalWhereInput = {};
    if (filtro?.texto) {
      where.nombre = { contains: filtro.texto, mode: "insensitive" };
    }
    return where;
  }

  async existeNombre(nombre: string, excluirId?: string): Promise<boolean> {
    // `mode: "insensitive"`, como en los planes: «Semana 1» y «semana 1» son el
    // mismo para quien mira la lista, así que esta comprobación es MÁS estricta
    // que el índice único (que sí distingue mayúsculas).
    const cantidad = await this.prisma.planSemanal.count({
      where: {
        nombre: { equals: nombre, mode: "insensitive" },
        ...(excluirId ? { NOT: { id: excluirId } } : {}),
      },
    });
    return cantidad > 0;
  }

  // --- Asignaciones ---------------------------------------------------------

  async asignarAPaciente(
    asignacion: AsignacionPlanSemanal,
  ): Promise<AsignacionPlanSemanal> {
    const fila = await this.prisma.asignacionPlanSemanal.create({
      data: {
        nutricionistaId: inquilinoActual(),
        id: asignacion.id,
        planSemanalId: asignacion.planSemanalId,
        nombrePlan: asignacion.nombrePlan,
        pacienteId: asignacion.pacienteId,
        fechaInicio: soloFecha(asignacion.fechaInicio),
        fechaFin: asignacion.fechaFin ? soloFecha(asignacion.fechaFin) : null,
        finalizadaEn: asignacion.finalizadaEn
          ? soloFecha(asignacion.finalizadaEn)
          : null,
        activa: asignacion.activa,
      },
    });
    return mapearAsignacionSemanal(fila);
  }

  async desactivarAsignacionesDe(
    pacienteId: string,
    finalizadaEn: Date,
  ): Promise<void> {
    await this.prisma.asignacionPlanSemanal.updateMany({
      where: { pacienteId, activa: true },
      data: { activa: false, finalizadaEn: soloFecha(finalizadaEn) },
    });
  }

  async obtenerAsignacionActiva(
    pacienteId: string,
  ): Promise<AsignacionPlanSemanal | null> {
    const fila = await this.prisma.asignacionPlanSemanal.findFirst({
      where: { pacienteId, activa: true },
    });
    return fila ? mapearAsignacionSemanal(fila) : null;
  }

  async listarAsignacionesDePaciente(
    pacienteId: string,
  ): Promise<AsignacionPlanSemanal[]> {
    const filas = await this.prisma.asignacionPlanSemanal.findMany({
      where: { pacienteId },
      orderBy: [{ fechaInicio: "desc" }, { creadoEn: "desc" }],
    });
    return filas.map((fila) => mapearAsignacionSemanal(fila));
  }

  async listarAsignacionesDePlan(
    planSemanalId: string,
  ): Promise<AsignacionSemanalConPaciente[]> {
    const filas = await this.prisma.asignacionPlanSemanal.findMany({
      where: { planSemanalId },
      include: { paciente: { select: { nombre: true, apellido: true } } },
      // Los que lo siguen HOY primero; después, los más recientes.
      orderBy: [{ activa: "desc" }, { fechaInicio: "desc" }],
    });
    return filas.map((fila) => ({
      ...mapearAsignacionSemanal(fila),
      pacienteNombre: fila.paciente.nombre,
      pacienteApellido: fila.paciente.apellido,
    }));
  }

  async obtenerPlanSemanalActivoDePaciente(
    pacienteId: string,
  ): Promise<PlanSemanal | null> {
    const asignacion = await this.prisma.asignacionPlanSemanal.findFirst({
      where: { pacienteId, activa: true },
      include: { plan: { include: INCLUIR_HIJOS } },
    });
    // `plan` puede ser null: si se borró, la asignación queda en el historial
    // sin él. Un paciente en ese estado no tiene menú vigente.
    return asignacion?.plan ? mapearPlanSemanal(asignacion.plan) : null;
  }

  async contarAsignacionesActivasDePlan(
    planSemanalId: string,
  ): Promise<number> {
    return this.prisma.asignacionPlanSemanal.count({
      where: { planSemanalId, activa: true },
    });
  }
}

/**
 * Las metas generales y los tipos (migración 91) como columnas de
 * `planes_semanales`. Las de cada día van aparte (`metasDiaParaPrisma`).
 */
function columnasDeMetas(metas: MetasPlanSemanal): {
  modoMetas: MetasPlanSemanal["modo"];
  caloriasMeta: number | null;
  proteinasMetaG: number | null;
  carbohidratosMetaG: number | null;
  grasasMetaG: number | null;
  caloriasMetaTipo: MetasPlanSemanal["tipos"]["calorias"];
  proteinasMetaTipo: MetasPlanSemanal["tipos"]["proteinasG"];
  carbohidratosMetaTipo: MetasPlanSemanal["tipos"]["carbohidratosG"];
  grasasMetaTipo: MetasPlanSemanal["tipos"]["grasasG"];
} {
  return {
    modoMetas: metas.modo,
    caloriasMeta: metas.general?.calorias ?? null,
    proteinasMetaG: metas.general?.proteinasG ?? null,
    carbohidratosMetaG: metas.general?.carbohidratosG ?? null,
    grasasMetaG: metas.general?.grasasG ?? null,
    caloriasMetaTipo: metas.tipos.calorias,
    proteinasMetaTipo: metas.tipos.proteinasG,
    carbohidratosMetaTipo: metas.tipos.carbohidratosG,
    grasasMetaTipo: metas.tipos.grasasG,
  };
}

/**
 * Las metas por día (migración 92) listas para el `create` anidado: una fila
 * por día que tenga alguna. Con GENERAL, ninguna. Llevan el inquilino
 * materializado, como el resto de las hijas.
 */
function metasDiaParaPrisma(
  metas: MetasPlanSemanal,
  inquilino: string,
): Prisma.MetaDiaPlanSemanalUncheckedCreateWithoutPlanInput[] {
  if (metas.modo !== "POR_DIA") return [];
  return DIAS_SEMANA.flatMap((dia) => {
    const valores = metas.porDia[dia];
    return valores
      ? [
          {
            nutricionistaId: inquilino,
            dia,
            caloriasMeta: valores.calorias,
            proteinasMetaG: valores.proteinasG,
            carbohidratosMetaG: valores.carbohidratosG,
            grasasMetaG: valores.grasasG,
          },
        ]
      : [];
  });
}

/** Las metas de la fila: las generales de sus columnas, las de cada día de sus filas. */
function metasDeFila(fila: PlanConHijos): MetasPlanSemanal {
  const tipos = {
    calorias: fila.caloriasMetaTipo,
    proteinasG: fila.proteinasMetaTipo,
    carbohidratosG: fila.carbohidratosMetaTipo,
    grasasG: fila.grasasMetaTipo,
  };
  if (fila.modoMetas === "POR_DIA") {
    const porDia: Partial<Record<DiaSemana, ValoresMeta>> = {};
    for (const meta of fila.metasDia) {
      porDia[meta.dia] = {
        calorias: meta.caloriasMeta,
        proteinasG: aNumero(meta.proteinasMetaG),
        carbohidratosG: aNumero(meta.carbohidratosMetaG),
        grasasG: aNumero(meta.grasasMetaG),
      };
    }
    return { modo: "POR_DIA", tipos, general: null, porDia };
  }
  const general: ValoresMeta = {
    calorias: fila.caloriasMeta,
    proteinasG: aNumero(fila.proteinasMetaG),
    carbohidratosG: aNumero(fila.carbohidratosMetaG),
    grasasG: aNumero(fila.grasasMetaG),
  };
  return {
    modo: "GENERAL",
    tipos,
    general: Object.values(general).some((v) => v != null) ? general : null,
    porDia: {},
  };
}

/**
 * Las franjas listas para el `create` anidado de Prisma.
 *
 * Las hijas del agregado llevan el inquilino MATERIALIZADO (migración 27): sin
 * él se llega a ellas por id directo sin ningún control de inquilino.
 */
function franjasParaPrisma(
  plan: ReturnType<PlanSemanal["aPrimitivos"]>,
  inquilino: string,
): Prisma.FranjaPlanSemanalUncheckedCreateWithoutPlanInput[] {
  return plan.franjas.map((franja) => ({
    id: franja.id,
    nutricionistaId: inquilino,
    nombre: franja.nombre,
    horaDesde: franja.horaDesde,
    horaHasta: franja.horaHasta,
    orden: franja.orden,
    comidas: {
      create: franja.comidas.map((comida) => ({
        id: comida.id,
        nutricionistaId: inquilino,
        dia: comida.dia,
        orden: comida.orden,
        descripcion: comida.descripcion,
        recetaId: comida.recetaId,
        porciones: comida.porciones,
        items: {
          create: comida.items.map((item) => ({
            id: item.id,
            nutricionistaId: inquilino,
            nombre: item.nombre,
            ...columnasDeCantidad(item),
            caloriasPor100: item.caloriasPor100,
            proteinasPor100: item.proteinasPor100,
            carbohidratosPor100: item.carbohidratosPor100,
            grasasPor100: item.grasasPor100,
            fuente: item.fuente,
            referenciaExterna: item.referenciaExterna,
            alimentoOrigenId: item.alimentoOrigenId,
            orden: item.orden,
          })),
        },
      })),
    },
  }));
}

export function mapearPlanSemanal(fila: PlanConHijos): PlanSemanal {
  return PlanSemanal.reconstruir({
    id: fila.id,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    metas: metasDeFila(fila),
    franjas: fila.franjas.map((franja) => ({
      id: franja.id,
      nombre: franja.nombre,
      horaDesde: franja.horaDesde,
      horaHasta: franja.horaHasta,
      orden: franja.orden,
      comidas: franja.comidas.map((comida) => ({
        id: comida.id,
        dia: comida.dia,
        orden: comida.orden,
        descripcion: comida.descripcion,
        recetaId: comida.recetaId,
        recetaNombre: comida.receta?.nombre ?? null,
        recetaMacros: comida.receta
          ? {
              calorias: aNumero(comida.receta.calorias),
              proteinasG: aNumero(comida.receta.proteinasG),
              carbohidratosG: aNumero(comida.receta.carbohidratosG),
              grasasG: aNumero(comida.receta.grasasG),
            }
          : null,
        porciones: aNumero(comida.porciones),
        items: comida.items.map((item) => ({
          id: item.id,
          nombre: item.nombre,
          ...cantidadDeFila(item),
          caloriasPor100: aNumero(item.caloriasPor100),
          proteinasPor100: aNumero(item.proteinasPor100),
          carbohidratosPor100: aNumero(item.carbohidratosPor100),
          grasasPor100: aNumero(item.grasasPor100),
          fuente: item.fuente,
          referenciaExterna: item.referenciaExterna,
          alimentoOrigenId: item.alimentoOrigenId,
          orden: item.orden,
        })),
      })),
    })),
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
  });
}

export function mapearAsignacionSemanal(
  fila: AsignacionFila,
): AsignacionPlanSemanal {
  return {
    id: fila.id,
    planSemanalId: fila.planSemanalId,
    nombrePlan: fila.nombrePlan,
    pacienteId: fila.pacienteId,
    fechaInicio: fila.fechaInicio,
    fechaFin: fila.fechaFin,
    finalizadaEn: fila.finalizadaEn,
    activa: fila.activa,
  };
}
