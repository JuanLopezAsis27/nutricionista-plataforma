import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Tipos de recomendación de un plan. */
export const TIPOS_RECOMENDACION = ["NUTRICIONAL", "SALUD"] as const;
export type TipoRecomendacionPlan = (typeof TIPOS_RECOMENDACION)[number];

/**
 * Cómo está hecho el plan. Son dos maneras de trabajar distintas, no dos
 * variantes de la misma:
 *
 *  - `APP`: se carga franja por franja acá adentro. Los archivos que lleve son
 *    ANEXOS —la lista de compras, un instructivo— y no reemplazan al plan.
 *  - `PDF`: el plan ES el archivo, armado afuera (Word, Canva). No hay comidas
 *    que cargar y es lo que el paciente ve al entrar a «Mi plan».
 *
 * Tenerlo declarado y no deducirlo de "¿tiene archivos?" es lo que impide que
 * el anexo de un plan cargado se muestre como si fuera el plan.
 */
export const MODALIDADES_PLAN = ["APP", "PDF"] as const;
export type ModalidadPlan = (typeof MODALIDADES_PLAN)[number];

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

/**
 * Archivo del plan: el PDF principal (modalidad PDF) o un anexo.
 *
 * Los completa el repositorio al leer, igual que `recetaNombre` en una opción:
 * al crear el plan solo se conocen los ids, porque subir y guardar son dos
 * pasos (el archivo se sube ANTES de que el plan exista).
 */
export interface ArchivoDelPlan {
  id: string;
  nombreOriginal: string;
  mimeType: string;
  tamanoBytes: number;
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
  modalidad: ModalidadPlan;
  /** Carpeta donde está guardado, o null si está suelto. */
  grupoId: string | null;
  /** Nombre de la carpeta. Lo completa el repositorio al leer. */
  grupoNombre: string | null;
  /** Archivos vinculados al plan: el principal y/o los anexos. */
  archivos: ArchivoDelPlan[];
  /** Cuál de ellos ES el plan. Solo en modalidad PDF; null en modalidad APP. */
  archivoPrincipalId: string | null;
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
  modalidad?: ModalidadPlan;
  /** Carpeta donde guardarlo (opcional). */
  grupoId?: string | null;
  /**
   * Id del Archivo ya subido que ES el plan. Obligatorio en modalidad PDF,
   * prohibido en modalidad APP (ahí ningún anexo puede hacer de plan).
   */
  archivoPrincipalId?: string | null;
}

/**
 * Entidad de dominio PlanNutricional (raíz de agregado: franjas de comida con
 * opciones intercambiables, equivalencias y recomendaciones).
 *
 * Invariantes locales: nombre obligatorio; el CONTENIDO que pide su modalidad
 * —comidas si es APP, archivo principal si es PDF—, cada franja con nombre y al
 * menos una opción con contenido; horas en formato HH:mm; metas de macros no
 * negativas.
 *
 * El contenido depende de la modalidad porque son dos maneras de trabajar y no
 * dos variantes de la misma (ver `MODALIDADES_PLAN`). Un plan APP sin comidas
 * no es un plan, es un nombre; y un plan PDF sin archivo no tiene qué mostrar.
 * Que un plan PDF no admita comidas es deliberado: si las admitiera habría dos
 * planes en el mismo registro y ninguna forma de decir cuál rige.
 *
 * La regla "un paciente solo puede tener un plan activo a la vez" pertenece a
 * la asignación (caso de uso AsignarPlanAPaciente).
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
    const modalidad: ModalidadPlan = datos.modalidad ?? "APP";
    const archivoPrincipalId = datos.archivoPrincipalId ?? null;

    if (modalidad === "PDF") {
      if (archivoPrincipalId === null) {
        throw new ErrorValidacion(
          "Un plan en PDF necesita el archivo del plan.",
        );
      }
      if (datos.comidas && datos.comidas.length > 0) {
        throw new ErrorValidacion(
          "Un plan en PDF no lleva comidas cargadas: el plan es el archivo. " +
            "Si querés cargarlo acá, creá un plan de la app.",
        );
      }
    } else {
      if (archivoPrincipalId !== null) {
        throw new ErrorValidacion(
          "Un plan de la app no puede tener un archivo principal: sus archivos son anexos.",
        );
      }
      if (!datos.comidas || datos.comidas.length === 0) {
        throw new ErrorValidacion("El plan debe tener al menos una comida.");
      }
    }
    validarMeta(datos.caloriasMeta, "calorías");
    validarMeta(datos.proteinasMetaG, "proteínas");
    validarMeta(datos.carbohidratosMetaG, "carbohidratos");
    validarMeta(datos.grasasMetaG, "grasas");

    const comidas: ComidaDelPlan[] = (datos.comidas ?? []).map(
      (comida, indiceComida) => {
        const nombreComida = comida.nombre?.trim() ?? "";
        if (nombreComida.length === 0) {
          throw new ErrorValidacion(
            "Cada comida del plan debe tener un nombre.",
          );
        }
        validarHora(comida.horaDesde, nombreComida);
        validarHora(comida.horaHasta, nombreComida);
        if (!comida.opciones || comida.opciones.length === 0) {
          throw new ErrorValidacion(
            `«${nombreComida}» debe tener al menos una opción.`,
          );
        }
        const opciones: OpcionDelPlan[] = comida.opciones.map(
          (opcion, indiceOpcion) => {
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
          },
        );
        return {
          id: generarId(),
          nombre: nombreComida,
          horaDesde: comida.horaDesde || null,
          horaHasta: comida.horaHasta || null,
          orden: indiceComida,
          opciones,
        };
      },
    );

    const equivalencias: EquivalenciaDelPlan[] = (
      datos.equivalencias ?? []
    ).map((equivalencia, indice) => {
      const titulo = equivalencia.titulo?.trim() ?? "";
      const detalle = equivalencia.detalle?.trim() ?? "";
      if (titulo.length === 0 || detalle.length === 0) {
        throw new ErrorValidacion(
          "Cada equivalencia debe tener título y detalle.",
        );
      }
      return { id: generarId(), titulo, detalle, orden: indice };
    });

    const recomendaciones: RecomendacionDelPlan[] = (
      datos.recomendaciones ?? []
    ).map((recomendacion, indice) => {
      const texto = recomendacion.texto?.trim() ?? "";
      if (texto.length === 0) {
        throw new ErrorValidacion("Cada recomendación debe tener un texto.");
      }
      return {
        id: generarId(),
        tipo: recomendacion.tipo,
        texto,
        orden: indice,
      };
    });

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
      modalidad,
      grupoId: datos.grupoId ?? null,
      // El nombre de la carpeta lo completa el repositorio al leer, igual que
      // los archivos: acá solo se conoce el id.
      grupoNombre: null,
      // Los archivos los completa el repositorio al leer: acá solo se conocen
      // los ids, y el principal es el único que la entidad necesita decidir.
      archivos: [],
      archivoPrincipalId,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesPlan): PlanNutricional {
    return new PlanNutricional(props);
  }

  /**
   * Versión actualizada e inmutable: reemplaza el contenido completo
   * (franjas, opciones, equivalencias, recomendaciones y PDF) preservando id,
   * esPlantilla, planOrigenId, archivado y creadoEn.
   *
   * La modalidad y el archivo principal se reemplazan como todo lo demás:
   * quien edita el plan manda los que quiere que queden, igual que manda las
   * comidas que no tocó. La lista de archivos leída se preserva —la vincula el
   * repositorio, no este método—.
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
      archivos: this.props.archivos.map((a) => ({ ...a })),
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
    // Los archivos no viajan al clon: cada uno pertenece a UN plan
    // (`archivos.planId`) y compartirlos haría que borrar el original le vaciara
    // los anexos al clon. Copiar los objetos del bucket sería otra función.
    //
    // Para un plan PDF eso no es una pérdida menor: sin el archivo no queda
    // nada, así que se corta acá con un mensaje que explique por qué, en vez de
    // dejar que falle más abajo como "un plan en PDF necesita el archivo".
    if (this.props.modalidad === "PDF") {
      throw new ErrorValidacion(
        "Un plan en PDF no se puede usar como plantilla: el archivo es de ese plan. Asignalo directamente al paciente.",
      );
    }
    return PlanNutricional.crear(
      {
        nombre: cambios.nombre?.trim() || this.props.nombre,
        descripcion: this.props.descripcion,
        esPlantilla: cambios.esPlantilla,
        modalidad: this.props.modalidad,
        grupoId: this.props.grupoId,
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
  get modalidad(): ModalidadPlan {
    return this.props.modalidad;
  }
  get grupoId(): string | null {
    return this.props.grupoId;
  }
  get archivos(): ReadonlyArray<ArchivoDelPlan> {
    return this.props.archivos;
  }

  /**
   * El archivo que ES el plan, o null si el plan se carga en la app.
   *
   * Resuelve acá el caso de que el elegido ya no esté —se borró el archivo y la
   * FK quedó en NULL—: cae en el primero que haya. El fallback vive en la
   * entidad y no en cada pantalla por lo mismo que en `Receta.fotoPrincipal`:
   * repetido en la UI, dos pantallas del mismo plan podrían mostrar archivos
   * distintos.
   */
  get archivoPrincipal(): ArchivoDelPlan | null {
    if (this.props.modalidad !== "PDF") return null;
    const elegido = this.props.archivos.find(
      (a) => a.id === this.props.archivoPrincipalId,
    );
    return elegido ?? this.props.archivos[0] ?? null;
  }

  /** Los archivos que NO son el plan: anexos, material de apoyo. */
  get adjuntos(): ReadonlyArray<ArchivoDelPlan> {
    const principal = this.archivoPrincipal;
    return principal === null
      ? this.props.archivos
      : this.props.archivos.filter((a) => a.id !== principal.id);
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
      archivos: this.props.archivos.map((a) => ({ ...a })),
    };
  }
}

function validarHora(hora: string | null | undefined, franja: string): void {
  if (hora != null && hora !== "" && !PATRON_HORA.test(hora)) {
    throw new ErrorValidacion(
      `La hora de «${franja}» debe tener formato HH:mm.`,
    );
  }
}

function validarMeta(valor: number | null | undefined, etiqueta: string): void {
  if (valor != null && (!Number.isFinite(valor) || valor < 0)) {
    throw new ErrorValidacion(`La meta de ${etiqueta} no puede ser negativa.`);
  }
}
