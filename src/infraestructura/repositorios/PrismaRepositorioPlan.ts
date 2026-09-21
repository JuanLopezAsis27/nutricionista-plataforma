import type {
  PrismaClient,
  Prisma,
  AsignacionPlan as AsignacionFila,
} from "@prisma/client";
import type { IAsignacionPlanRepositorio } from "@/dominio/repositorios/IAsignacionPlanRepositorio";
import type {
  IPlanRepositorio,
  AsignacionPlan,
  AsignacionConPaciente,
  FiltroPlanes,
} from "@/dominio/repositorios/IPlanRepositorio";
import { PlanNutricional } from "@/dominio/entidades/PlanNutricional";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";
import { enVersion, guardandoVersion } from "./base/edicionConcurrente";

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
  // Orden estable: es el orden en el que el paciente lee los documentos del
  // plan, y sin ORDER BY cambiaría entre consultas.
  archivos: {
    orderBy: { creadoEn: "asc" },
    select: {
      id: true,
      nombreOriginal: true,
      mimeType: true,
      tamanoBytes: true,
      esDocumentoDelPlan: true,
    },
  },
  // Recetas vinculadas directamente al plan (sin franja): solo el nombre, para
  // mostrarlo sin una consulta aparte. Orden estable por fecha de vínculo.
  recetasVinculadas: {
    orderBy: { creadoEn: "asc" },
    include: { receta: { select: { nombre: true } } },
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
export class PrismaRepositorioPlan
  implements IPlanRepositorio, IAsignacionPlanRepositorio
{
  constructor(private readonly prisma: PrismaClient) {}

  async crear(
    plan: PlanNutricional,
    archivoIds: string[],
    recetaIds: string[],
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
      await this.vincularArchivos(tx, d.id, archivoIds, d.documentoIds);
      await this.vincularRecetas(tx, d.id, recetaIds);
      return tx.planNutricional.findUniqueOrThrow({
        where: { id: d.id },
        include: INCLUIR_HIJOS,
      });
    });
    return mapearPlan(fila);
  }

  async actualizar(
    plan: PlanNutricional,
    archivoIds: string[],
    recetaIds: string[],
    esperadoEn?: Date,
  ): Promise<PlanNutricional> {
    const d = plan.aPrimitivos();
    // Las hijas del agregado llevan el inquilino materializado (migración 27).
    const inquilino = inquilinoActual();
    // Reemplaza el conjunto de hijos: borra los viejos y crea los nuevos
    // (las opciones caen en cascada con sus comidas).
    //
    // Los borrados van ANTES del update que lleva la guardia de versión, así
    // que un conflicto los encuentra ya hechos: lo que los deshace es el
    // rollback de la transacción, no el orden. Sin transacción, un choque
    // dejaría el plan sin franjas, sin equivalencias y sin recomendaciones.
    const fila = await guardandoVersion("El plan", esperadoEn, () =>
      this.prisma.$transaction(async (tx) => {
        await tx.comidaPlan.deleteMany({ where: { planId: d.id } });
        await tx.equivalenciaPlan.deleteMany({ where: { planId: d.id } });
        await tx.recomendacionPlan.deleteMany({ where: { planId: d.id } });
        await tx.planNutricional.update({
          where: enVersion(d.id, esperadoEn),
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
        await this.vincularArchivos(tx, d.id, archivoIds, d.documentoIds);
        await this.vincularRecetas(tx, d.id, recetaIds);
        return tx.planNutricional.findUniqueOrThrow({
          where: { id: d.id },
          include: INCLUIR_HIJOS,
        });
      }),
    );
    return mapearPlan(fila);
  }

  /**
   * Deja al plan con exactamente esas recetas vinculadas. A diferencia de un
   * archivo, la que sale de la lista se DESVINCULA nomás: tiene dueño propio
   * (el recetario) y sigue existiendo ahí.
   */
  private async vincularRecetas(
    tx: Prisma.TransactionClient,
    planId: string,
    recetaIds: string[],
  ): Promise<void> {
    await tx.recetaDelPlan.deleteMany({ where: { planId } });
    if (recetaIds.length > 0) {
      await tx.recetaDelPlan.createMany({
        data: recetaIds.map((recetaId) => ({
          id: crypto.randomUUID(),
          nutricionistaId: inquilinoActual(),
          planId,
          recetaId,
        })),
      });
    }
  }

  /**
   * Deja al plan con exactamente esos archivos, y marcados como documentos
   * exactamente esos otros.
   *
   * Los que salen de la lista se BORRAN, no se desvinculan: un archivo sin
   * dueño no lo recoge nadie —el barrido del worker limpia objetos del bucket
   * sin fila, no filas sin dueño—, así que desvincularlos dejaría metadatos
   * huérfanos para siempre. Borrada la fila, el objeto del bucket queda
   * huérfano de verdad y ese barrido sí se lo lleva.
   *
   * La marca de documento se pone DESPUÉS de vincular: un archivo recién
   * subido todavía no es del plan, y marcarlo antes ensuciaría una fila que la
   * primera consulta ni siquiera trae. Y se limpia primero en TODO el plan
   * para que un documento que pasó a anexo pierda la marca: la lista que llega
   * es el estado final, igual que la de archivos.
   */
  private async vincularArchivos(
    tx: Prisma.TransactionClient,
    planId: string,
    archivoIds: string[],
    documentoIds: string[],
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
    await tx.archivo.updateMany({
      where: { planId },
      data: { esDocumentoDelPlan: false },
    });
    const documentos = documentoIds.filter((id) => archivoIds.includes(id));
    if (documentos.length > 0) {
      await tx.archivo.updateMany({
        where: { planId, id: { in: documentos } },
        data: { esDocumentoDelPlan: true },
      });
    }
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
    return fila ? mapearPlan(fila) : null;
  }

  async listar(filtro?: FiltroPlanes): Promise<PlanNutricional[]> {
    const filas = await this.prisma.planNutricional.findMany({
      where: this.construirWhere(filtro),
      include: INCLUIR_HIJOS,
      orderBy: { creadoEn: "desc" },
      skip: filtro?.desplazamiento,
      take: filtro?.limite,
    });
    return filas.map((fila) => mapearPlan(fila));
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

  async contarAsignacionesDePlan(planId: string): Promise<number> {
    return this.prisma.asignacionPlan.count({ where: { planId } });
  }

  /**
   * Idempotente por la clave única (planId, pacienteId): asignar de nuevo un
   * plan que el paciente ya tiene no lo duplica ni falla, igual que en recetas
   * y materiales. El `id` nuevo se descarta en ese caso.
   */
  async asignarAPaciente(asignacion: AsignacionPlan): Promise<AsignacionPlan> {
    const fila = await this.prisma.asignacionPlan.upsert({
      where: {
        planId_pacienteId: {
          planId: asignacion.planId,
          pacienteId: asignacion.pacienteId,
        },
      },
      create: {
        nutricionistaId: inquilinoActual(),
        id: asignacion.id,
        planId: asignacion.planId,
        pacienteId: asignacion.pacienteId,
      },
      update: {},
    });
    return mapearAsignacionPlan(fila);
  }

  /**
   * Borra el vínculo y deja el registro de que existió, en una transacción: son
   * la misma operación vista de los dos lados.
   *
   * El nombre del plan se copia ACÁ y no se resuelve después por `planId`: el
   * plan se puede renombrar o borrar, y el registro tiene que seguir diciendo
   * qué tenía el paciente entonces. Es la misma foto que llevaba la vieja
   * `asignaciones_plan`, ahora del lado que sí la necesita.
   *
   * El `id` lo pone el default del modelo: la desasignación es un registro de
   * infraestructura, no una entidad que el dominio construya.
   */
  async desasignarDePaciente(
    planId: string,
    pacienteId: string,
    desasignadoEn: Date,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const asignacion = await tx.asignacionPlan.findUnique({
        where: { planId_pacienteId: { planId, pacienteId } },
        include: { plan: { select: { nombre: true } } },
      });
      // No lo tenía asignado: no hay vínculo que borrar ni nada que registrar.
      if (!asignacion) return;

      await tx.desasignacionPlan.create({
        data: {
          nutricionistaId: inquilinoActual(),
          pacienteId,
          planId,
          nombrePlan: asignacion.plan.nombre,
          asignadoEn: asignacion.creadoEn,
          desasignadoEn,
        },
      });
      await tx.asignacionPlan.delete({ where: { id: asignacion.id } });
    });
  }

  async estaAsignado(planId: string, pacienteId: string): Promise<boolean> {
    const cantidad = await this.prisma.asignacionPlan.count({
      where: { planId, pacienteId },
    });
    return cantidad > 0;
  }

  async listarAsignacionesDePlan(
    planId: string,
  ): Promise<AsignacionConPaciente[]> {
    const filas = await this.prisma.asignacionPlan.findMany({
      where: { planId },
      include: { paciente: { select: { nombre: true, apellido: true } } },
      orderBy: [
        { paciente: { apellido: "asc" } },
        { paciente: { nombre: "asc" } },
      ],
    });
    return filas.map((fila) => ({
      ...mapearAsignacionPlan(fila),
      pacienteNombre: fila.paciente.nombre,
      pacienteApellido: fila.paciente.apellido,
    }));
  }

  async listarPlanesDePaciente(pacienteId: string): Promise<PlanNutricional[]> {
    const filas = await this.prisma.planNutricional.findMany({
      where: { asignaciones: { some: { pacienteId } } },
      include: INCLUIR_HIJOS,
      orderBy: { nombre: "asc" },
    });
    return filas.map((fila) => mapearPlan(fila));
  }
}

export function mapearPlan(fila: PlanConHijos): PlanNutricional {
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
      esDocumento: archivo.esDocumentoDelPlan,
    })),
    documentoIds: fila.archivos
      .filter((archivo) => archivo.esDocumentoDelPlan)
      .map((archivo) => archivo.id),
    recetasVinculadas: fila.recetasVinculadas.map((vinculo) => ({
      recetaId: vinculo.recetaId,
      recetaNombre: vinculo.receta.nombre,
    })),
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
  });
}

export function mapearAsignacionPlan(fila: AsignacionFila): AsignacionPlan {
  return {
    id: fila.id,
    planId: fila.planId,
    pacienteId: fila.pacienteId,
  };
}
