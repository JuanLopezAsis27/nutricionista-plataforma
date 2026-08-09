import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Tipos de recomendación de un plan. */
export const TIPOS_RECOMENDACION = ["NUTRICIONAL", "SALUD"] as const;
export type TipoRecomendacionPlan = (typeof TIPOS_RECOMENDACION)[number];

const PATRON_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

// --- Estado persistido -------------------------------------------------------

/** Macros por porción de la receta vinculada a una opción (los completa el repositorio). */
export interface MacrosOpcion {
  calorias: number | null;
  proteinasG: number | null;
  carbohidratosG: number | null;
  grasasG: number | null;
}

/** Opción intercambiable de una franja (nombre y macros de la receta los completa el repositorio). */
export interface OpcionDelPlan {
  id: string;
  numero: number;
  contenido: string;
  recetaId: string | null;
  recetaNombre: string | null;
  recetaMacros: MacrosOpcion | null;
  orden: number;
}

/** Franja de comida del plan (Desayuno, Colación…) con sus opciones. */
export interface ComidaDelPlan {
  id: string;
  nombre: string;
  horaDesde: string | null;
  horaHasta: string | null;
  orden: number;
  opciones: OpcionDelPlan[];
}

export interface EquivalenciaDelPlan {
  id: string;
  titulo: string;
  detalle: string;
  orden: number;
}

export interface RecomendacionDelPlan {
  id: string;
  tipo: TipoRecomendacionPlan;
  texto: string;
  orden: number;
}

/** Estado completo de un plan persistido. */
export interface PropiedadesPlan {
  id: string;
  nombre: string;
  descripcion: string | null;
  esPlantilla: boolean;
  planOrigenId: string | null;
  archivado: boolean;
  caloriasMeta: number | null;
  proteinasMetaG: number | null;
  carbohidratosMetaG: number | null;
  grasasMetaG: number | null;
  contactosUtiles: string | null;
  comidas: ComidaDelPlan[];
  equivalencias: EquivalenciaDelPlan[];
  recomendaciones: RecomendacionDelPlan[];
  creadoEn: Date;
  actualizadoEn: Date;
}

// --- Datos de entrada --------------------------------------------------------

export interface DatosOpcionPlan {
  contenido: string;
  recetaId?: string | null;
}

export interface DatosComidaPlan {
  nombre: string;
  horaDesde?: string | null;
  horaHasta?: string | null;
  opciones: DatosOpcionPlan[];
}

export interface DatosEquivalenciaPlan {
  titulo: string;
  detalle: string;
}

export interface DatosRecomendacionPlan {
  tipo: TipoRecomendacionPlan;
  texto: string;
}

/** Datos para crear (o reemplazar el contenido de) un plan. */
export interface DatosNuevoPlan {
  nombre: string;
  descripcion?: string | null;
  esPlantilla?: boolean;
  planOrigenId?: string | null;
  caloriasMeta?: number | null;
  proteinasMetaG?: number | null;
  carbohidratosMetaG?: number | null;
  grasasMetaG?: number | null;
  contactosUtiles?: string | null;
  comidas: DatosComidaPlan[];
  equivalencias?: DatosEquivalenciaPlan[];
  recomendaciones?: DatosRecomendacionPlan[];
}

/**
 * Entidad de dominio PlanNutricional (raíz de agregado: franjas de comida con
 * opciones intercambiables, equivalencias y recomendaciones).
 *
 * Invariantes locales: nombre obligatorio; al menos una franja, cada una con
 * nombre y al menos una opción con contenido; horas en formato HH:mm; metas
 * de macros no negativas. La regla "un paciente solo puede tener un plan
 * activo a la vez" pertenece a la asignación (caso de uso AsignarPlanAPaciente).
 */
export class PlanNutricional {
  private constructor(private readonly props: PropiedadesPlan) {}

  static crear(
    datos: DatosNuevoPlan,
    id: string,
    generarId: () => string,
    ahora: Date = new Date(),
  ): PlanNutricional {
    const nombre = datos.nombre?.trim() ?? "";
    if (nombre.length === 0) {
      throw new ErrorValidacion("El plan debe tener un nombre.");
    }
    if (!datos.comidas || datos.comidas.length === 0) {
      throw new ErrorValidacion("El plan debe tener al menos una comida.");
    }
    validarMeta(datos.caloriasMeta, "calorías");
    validarMeta(datos.proteinasMetaG, "proteínas");
    validarMeta(datos.carbohidratosMetaG, "carbohidratos");
    validarMeta(datos.grasasMetaG, "grasas");

    const comidas: ComidaDelPlan[] = datos.comidas.map((comida, indiceComida) => {
      const nombreComida = comida.nombre?.trim() ?? "";
      if (nombreComida.length === 0) {
        throw new ErrorValidacion("Cada comida del plan debe tener un nombre.");
      }
      validarHora(comida.horaDesde, nombreComida);
      validarHora(comida.horaHasta, nombreComida);
      if (!comida.opciones || comida.opciones.length === 0) {
        throw new ErrorValidacion(`«${nombreComida}» debe tener al menos una opción.`);
      }
      const opciones: OpcionDelPlan[] = comida.opciones.map((opcion, indiceOpcion) => {
        const contenido = opcion.contenido?.trim() ?? "";
        if (contenido.length === 0) {
          throw new ErrorValidacion(
            `Las opciones de «${nombreComida}» no pueden estar vacías.`,
          );
        }
        return {
          id: generarId(),
          numero: indiceOpcion + 1,
          contenido,
          recetaId: opcion.recetaId ?? null,
          recetaNombre: null,
          recetaMacros: null,
          orden: indiceOpcion,
        };
      });
      return {
        id: generarId(),
        nombre: nombreComida,
        horaDesde: comida.horaDesde || null,
        horaHasta: comida.horaHasta || null,
        orden: indiceComida,
        opciones,
      };
    });

    const equivalencias: EquivalenciaDelPlan[] = (datos.equivalencias ?? []).map(
      (equivalencia, indice) => {
        const titulo = equivalencia.titulo?.trim() ?? "";
        const detalle = equivalencia.detalle?.trim() ?? "";
        if (titulo.length === 0 || detalle.length === 0) {
          throw new ErrorValidacion("Cada equivalencia debe tener título y detalle.");
        }
        return { id: generarId(), titulo, detalle, orden: indice };
      },
    );

    const recomendaciones: RecomendacionDelPlan[] = (datos.recomendaciones ?? []).map(
      (recomendacion, indice) => {
        const texto = recomendacion.texto?.trim() ?? "";
        if (texto.length === 0) {
          throw new ErrorValidacion("Cada recomendación debe tener un texto.");
        }
        return { id: generarId(), tipo: recomendacion.tipo, texto, orden: indice };
      },
    );

    return new PlanNutricional({
      id,
      nombre,
      descripcion: datos.descripcion?.trim() || null,
      esPlantilla: datos.esPlantilla ?? false,
      planOrigenId: datos.planOrigenId ?? null,
      archivado: false,
      caloriasMeta: datos.caloriasMeta ?? null,
      proteinasMetaG: datos.proteinasMetaG ?? null,
      carbohidratosMetaG: datos.carbohidratosMetaG ?? null,
      grasasMetaG: datos.grasasMetaG ?? null,
      contactosUtiles: datos.contactosUtiles?.trim() || null,
      comidas,
      equivalencias,
      recomendaciones,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesPlan): PlanNutricional {
    return new PlanNutricional(props);
  }

  /**
   * Versión actualizada e inmutable: reemplaza el contenido completo
   * (franjas, opciones, equivalencias, recomendaciones) preservando id,
   * esPlantilla, planOrigenId, archivado y creadoEn.
   */
  actualizar(
    datos: Omit<DatosNuevoPlan, "esPlantilla" | "planOrigenId">,
    generarId: () => string,
    ahora: Date = new Date(),
  ): PlanNutricional {
    const actualizado = PlanNutricional.crear(
      {
        ...datos,
        esPlantilla: this.props.esPlantilla,
        planOrigenId: this.props.planOrigenId,
      },
      this.props.id,
      generarId,
      ahora,
    );
    return new PlanNutricional({
      ...actualizado.props,
      archivado: this.props.archivado,
      creadoEn: this.props.creadoEn,
    });
  }

  /**
   * Clon profundo con ids nuevos (para crear un plan desde una plantilla o
   * duplicar). El clon nace sin archivar y con planOrigenId apuntando acá.
   */
  clonar(
    nuevoId: string,
    generarId: () => string,
    cambios: { nombre?: string; esPlantilla: boolean },
    ahora: Date = new Date(),
  ): PlanNutricional {
    return PlanNutricional.crear(
      {
        nombre: cambios.nombre?.trim() || this.props.nombre,
        descripcion: this.props.descripcion,
        esPlantilla: cambios.esPlantilla,
        planOrigenId: this.props.id,
        caloriasMeta: this.props.caloriasMeta,
        proteinasMetaG: this.props.proteinasMetaG,
        carbohidratosMetaG: this.props.carbohidratosMetaG,
        grasasMetaG: this.props.grasasMetaG,
        contactosUtiles: this.props.contactosUtiles,
        comidas: this.props.comidas.map((comida) => ({
          nombre: comida.nombre,
          horaDesde: comida.horaDesde,
          horaHasta: comida.horaHasta,
          opciones: comida.opciones.map((opcion) => ({
            contenido: opcion.contenido,
            recetaId: opcion.recetaId,
          })),
        })),
        equivalencias: this.props.equivalencias.map((e) => ({
          titulo: e.titulo,
          detalle: e.detalle,
        })),
        recomendaciones: this.props.recomendaciones.map((r) => ({
          tipo: r.tipo,
          texto: r.texto,
        })),
      },
      nuevoId,
      generarId,
      ahora,
    );
  }

  get id(): string {
    return this.props.id;
  }
  get nombre(): string {
    return this.props.nombre;
  }
  get esPlantilla(): boolean {
    return this.props.esPlantilla;
  }
  get archivado(): boolean {
    return this.props.archivado;
  }
  get comidas(): ReadonlyArray<ComidaDelPlan> {
    return this.props.comidas;
  }

  aPrimitivos(): PropiedadesPlan {
    return {
      ...this.props,
      comidas: this.props.comidas.map((comida) => ({
        ...comida,
        opciones: comida.opciones.map((opcion) => ({ ...opcion })),
      })),
      equivalencias: this.props.equivalencias.map((e) => ({ ...e })),
      recomendaciones: this.props.recomendaciones.map((r) => ({ ...r })),
    };
  }
}

function validarHora(hora: string | null | undefined, franja: string): void {
  if (hora != null && hora !== "" && !PATRON_HORA.test(hora)) {
    throw new ErrorValidacion(`La hora de «${franja}» debe tener formato HH:mm.`);
  }
}

function validarMeta(valor: number | null | undefined, etiqueta: string): void {
  if (valor != null && (!Number.isFinite(valor) || valor < 0)) {
    throw new ErrorValidacion(`La meta de ${etiqueta} no puede ser negativa.`);
  }
}
