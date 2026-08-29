import type {
  PrismaClient,
  Prisma,
  AsignacionPlan as AsignacionFila,
} from "@prisma/client";
import type {
  IPlanRepositorio,
  AsignacionPlan,
  AsignacionConPaciente,
  FiltroPlanes,
} from "@/dominio/repositorios/IPlanRepositorio";
import { PlanNutricional } from "@/dominio/entidades/PlanNutricional";
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
  // Solo el nombre de la carpeta: la pantalla muestra dónde está guardado.
  grupo: { select: { nombre: true } },
  // Archivos del plan: solo su ficha, nunca el contenido (vive en el bucket).
  // Orden estable: sin ORDER BY, "el primero" cambia entre consultas y el
  // fallback del archivo principal iría rotando solo.
  archivos: {
    orderBy: { creadoEn: "asc" },
    select: {
      id: true,
      nombreOriginal: true,
      mimeType: true,
      tamanoBytes: true,
    },
  },
} satisfies Prisma.PlanNutricionalInclude;

type PlanConHijos = Prisma.PlanNutricionalGetPayload<{
  include: typeof INCLUIR_HIJOS;
}>;

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

  async crear(
    plan: PlanNutricional,
    archivoIds: string[],
  ): Promise<PlanNutricional> {
    const d = plan.aPrimitivos();
    // Las hijas del agregado llevan el inquilino materializado (migración 27).
    const inquilino = inquilinoActual();
    const fila = await this.prisma.$transaction(async (tx) => {
      await tx.planNutricional.create({
        data: {
          nutricionistaId: inquilinoActual(),
          id: d.id,
          nombre: d.nombre,
          descripcion: d.descripcion,
          esPlantilla: d.esPlantilla,
          modalidad: d.modalidad,
          grupoId: d.grupoId,
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
      });
      await this.vincularArchivos(tx, d.id, archivoIds, d.archivoPrincipalId);
      return tx.planNutricional.findUniqueOrThrow({
        where: { id: d.id },
        include: INCLUIR_HIJOS,
      });
    });
    return this.mapear(fila);
  }

  async actualizar(
    plan: PlanNutricional,
    archivoIds: string[],
  ): Promise<PlanNutricional> {
    const d = plan.aPrimitivos();
    // Las hijas del agregado llevan el inquilino materializado (migración 27).
    const inquilino = inquilinoActual();
    // Reemplaza el conjunto de hijos: borra los viejos y crea los nuevos
    // (las opciones caen en cascada con sus comidas).
    const fila = await this.prisma.$transaction(async (tx) => {
      await tx.comidaPlan.deleteMany({ where: { planId: d.id } });
      await tx.equivalenciaPlan.deleteMany({ where: { planId: d.id } });
      await tx.recomendacionPlan.deleteMany({ where: { planId: d.id } });
      await tx.planNutricional.update({
        where: { id: d.id },
        data: {
          nombre: d.nombre,
          descripcion: d.descripcion,
          modalidad: d.modalidad,
          grupoId: d.grupoId,
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
      });
      await this.vincularArchivos(tx, d.id, archivoIds, d.archivoPrincipalId);
      return tx.planNutricional.findUniqueOrThrow({
        where: { id: d.id },
        include: INCLUIR_HIJOS,
      });
    });
    return this.mapear(fila);
  }

  /**
   * Deja al plan con exactamente esos archivos y ese principal.
   *
   * Los que salen de la lista se BORRAN, no se desvinculan: un archivo sin
   * dueño no lo recoge nadie —el barrido del worker limpia objetos del bucket
   * sin fila, no filas sin dueño—, así que desvincularlos dejaría metadatos
   * huérfanos para siempre. Borrada la fila, el objeto del bucket queda
   * huérfano de verdad y ese barrido sí se lo lleva.
   *
   * El principal se fija DESPUÉS de vincular: la FK exige que el archivo
   * exista, y si se fijara antes apuntaría a uno que todavía no es del plan.
   */
  private async vincularArchivos(
    tx: Prisma.TransactionClient,
    planId: string,
    archivoIds: string[],
    archivoPrincipalId: string | null,
  ): Promise<void> {
    await tx.archivo.deleteMany({
      where: {
        planId,
        ...(archivoIds.length > 0 ? { NOT: { id: { in: archivoIds } } } : {}),
      },
    });
    if (archivoIds.length > 0) {
      await tx.archivo.updateMany({
        where: { id: { in: archivoIds } },
        data: { planId },
      });
    }
    await tx.planNutricional.update({
      where: { id: planId },
      data: {
        archivoPrincipalId:
          archivoPrincipalId && archivoIds.includes(archivoPrincipalId)
            ? archivoPrincipalId
            : null,
      },
    });
  }

  async eliminar(id: string): Promise<void> {
    // Los hijos caen en cascada. Las ASIGNACIONES no: su FK es SET NULL y
    // quedan en el historial del paciente con el nombre que el plan tenía
    // (migración 38).
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
    return this.prisma.planNutricional.count({
      where: this.construirWhere(filtro),
    });
  }

  private construirWhere(
    filtro?: FiltroPlanes,
  ): Prisma.PlanNutricionalWhereInput {
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
    // `null` es un filtro legítimo: "los que no están en ninguna carpeta".
    // Por eso se compara contra undefined y no con un `if (filtro?.grupoId)`.
    if (filtro?.grupoId !== undefined) {
      where.grupoId = filtro.grupoId;
    }
    return where;
  }

  async marcarArchivado(id: string, archivado: boolean): Promise<void> {
    await this.prisma.planNutricional.update({
      where: { id },
      data: { archivado },
    });
  }

  async existeNombre(
    nombre: string,
    esPlantilla: boolean,
    excluirId?: string,
  ): Promise<boolean> {
    // `mode: "insensitive"` para que "Descenso" y "descenso" cuenten como el
    // mismo plan: en la lista de asignación nadie los distingue. El índice
    // único de la base es sensible a mayúsculas, así que esta comprobación es
    // MÁS estricta que él —y es la que ve el profesional—.
    const cantidad = await this.prisma.planNutricional.count({
      where: {
        esPlantilla,
        nombre: { equals: nombre, mode: "insensitive" },
        ...(excluirId ? { NOT: { id: excluirId } } : {}),
      },
    });
    return cantidad > 0;
  }

  async moverAGrupo(id: string, grupoId: string | null): Promise<void> {
    await this.prisma.planNutricional.update({
      where: { id },
      data: { grupoId },
    });
  }

  async contarAsignacionesActivasDePlan(planId: string): Promise<number> {
    return this.prisma.asignacionPlan.count({
      where: { planId, activa: true },
    });
  }

  async asignarAPaciente(asignacion: AsignacionPlan): Promise<AsignacionPlan> {
    const fila = await this.prisma.asignacionPlan.create({
      data: {
        nutricionistaId: inquilinoActual(),
        id: asignacion.id,
        planId: asignacion.planId,
        nombrePlan: asignacion.nombrePlan,
        pacienteId: asignacion.pacienteId,
        fechaInicio: this.soloFecha(asignacion.fechaInicio),
        fechaFin: asignacion.fechaFin
          ? this.soloFecha(asignacion.fechaFin)
          : null,
        finalizadaEn: asignacion.finalizadaEn
          ? this.soloFecha(asignacion.finalizadaEn)
          : null,
        activa: asignacion.activa,
      },
    });
    return this.mapearAsignacion(fila);
  }

  async desactivarAsignacionesDe(
    pacienteId: string,
    finalizadaEn: Date,
  ): Promise<void> {
    await this.prisma.asignacionPlan.updateMany({
      where: { pacienteId, activa: true },
      data: { activa: false, finalizadaEn: this.soloFecha(finalizadaEn) },
    });
  }

  async listarAsignacionesDePlan(
    planId: string,
  ): Promise<AsignacionConPaciente[]> {
    const filas = await this.prisma.asignacionPlan.findMany({
      where: { planId },
      include: { paciente: { select: { nombre: true, apellido: true } } },
      // Los que lo siguen HOY primero; después, los más recientes.
      orderBy: [{ activa: "desc" }, { fechaInicio: "desc" }],
    });
    return filas.map((fila) => ({
      ...this.mapearAsignacion(fila),
      pacienteNombre: fila.paciente.nombre,
      pacienteApellido: fila.paciente.apellido,
    }));
  }

  async listarAsignacionesDePaciente(
    pacienteId: string,
  ): Promise<AsignacionPlan[]> {
    const filas = await this.prisma.asignacionPlan.findMany({
      where: { pacienteId },
      orderBy: [{ fechaInicio: "desc" }, { creadoEn: "desc" }],
    });
    return filas.map((fila) => this.mapearAsignacion(fila));
  }

  async obtenerAsignacionActiva(
    pacienteId: string,
  ): Promise<AsignacionPlan | null> {
    const fila = await this.prisma.asignacionPlan.findFirst({
      where: { pacienteId, activa: true },
    });
    return fila ? this.mapearAsignacion(fila) : null;
  }

  async obtenerPlanActivoDePaciente(
    pacienteId: string,
  ): Promise<PlanNutricional | null> {
    const asignacion = await this.prisma.asignacionPlan.findFirst({
      where: { pacienteId, activa: true },
      include: { plan: { include: INCLUIR_HIJOS } },
    });
    // `plan` puede ser null desde la migración 38: si el plan se borró, la
    // asignación queda en el historial sin él. Un paciente en ese estado no
    // tiene plan vigente, que es exactamente lo que devuelve este método.
    return asignacion?.plan ? this.mapear(asignacion.plan) : null;
  }

  async listarAsignacionesActivasVencidas(
    fechaLimite: Date,
  ): Promise<AsignacionPlan[]> {
    const filas = await this.prisma.asignacionPlan.findMany({
      where: {
        activa: true,
        fechaFin: { not: null, lt: this.soloFecha(fechaLimite) },
      },
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
        tipo: recomendacion.tipo,
        texto: recomendacion.texto,
        orden: recomendacion.orden,
      })),
      modalidad: fila.modalidad,
      grupoId: fila.grupoId,
      grupoNombre: fila.grupo?.nombre ?? null,
      archivos: fila.archivos.map((archivo) => ({
        id: archivo.id,
        nombreOriginal: archivo.nombreOriginal,
        mimeType: archivo.mimeType,
        tamanoBytes: archivo.tamanoBytes,
      })),
      archivoPrincipalId: fila.archivoPrincipalId,
      creadoEn: fila.creadoEn,
      actualizadoEn: fila.actualizadoEn,
    });
  }

  private mapearAsignacion(fila: AsignacionFila): AsignacionPlan {
    return {
      id: fila.id,
      planId: fila.planId,
      nombrePlan: fila.nombrePlan,
      pacienteId: fila.pacienteId,
      fechaInicio: fila.fechaInicio,
      fechaFin: fila.fechaFin,
      finalizadaEn: fila.finalizadaEn,
      activa: fila.activa,
    };
  }
}
