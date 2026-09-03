import { ErrorValidacion } from "../errores/ErrorValidacion";
import {
  sumarPorGramos,
  sumarMacros,
  sumarTodos,
  escalarMacros,
  MACROS_VACIOS,
  type Macros,
} from "../servicios/macrosAlimentos";

/**
 * Días de la semana, en el orden en que se leen en la grilla.
 *
 * Es un enum de dominio y no un número 0-6 porque el día acá no es una fecha:
 * un plan semanal es de referencia —«los lunes»— y no arranca en ninguna
 * semana concreta. Guardar 0..6 obligaría a recordar en cada lectura si el 0
 * es domingo (como `getUTCDay`) o lunes (como la grilla).
 */
export const DIAS_SEMANA = [
  "LUNES",
  "MARTES",
  "MIERCOLES",
  "JUEVES",
  "VIERNES",
  "SABADO",
  "DOMINGO",
] as const;
export type DiaSemana = (typeof DIAS_SEMANA)[number];

/** Etiqueta corta de cada día, la que va en el encabezado de la grilla. */
export const ETIQUETA_DIA: Record<DiaSemana, string> = {
  LUNES: "Lun",
  MARTES: "Mar",
  MIERCOLES: "Mié",
  JUEVES: "Jue",
  VIERNES: "Vie",
  SABADO: "Sáb",
  DOMINGO: "Dom",
};

const PATRON_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

// --- Estado persistido -------------------------------------------------------

/** Alimento de una comida: cantidad en gramos + macros por 100 g. */
export interface ItemDeComidaSemanal {
  id: string;
  nombre: string;
  cantidadGramos: number | null;
  caloriasPor100: number | null;
  proteinasPor100: number | null;
  carbohidratosPor100: number | null;
  grasasPor100: number | null;
  /** De dónde salieron los macros: "OFF", "FATSECRET", "PROPIO", "MANUAL". */
  fuente: string | null;
  referenciaExterna: string | null;
  orden: number;
}

/**
 * Una comida concreta del plan: un día, una franja y su contenido.
 *
 * `orden` es lo que distingue a las ALTERNATIVAS de un mismo día y franja
 * (tres almuerzos posibles para el lunes). La de `orden` 0 es la principal:
 * es la que suma al total del día. Las otras son intercambiables con ella y
 * por eso no se suman —si se sumaran, un lunes con tres almuerzos daría el
 * triple de calorías que uno con uno solo—.
 */
export interface ComidaSemanal {
  id: string;
  dia: DiaSemana;
  orden: number;
  /** Texto libre de la comida, como se lo lee el paciente. */
  descripcion: string | null;
  recetaId: string | null;
  /** Nombre de la receta vinculada. Lo completa el repositorio al leer. */
  recetaNombre: string | null;
  /** Macros POR PORCIÓN de la receta. Los completa el repositorio al leer. */
  recetaMacros: Macros | null;
  /** Cuántas porciones de esa receta entran en la comida (1 por defecto). */
  porciones: number | null;
  items: ItemDeComidaSemanal[];
}

/** Franja horaria del plan (Desayuno, Col. AM…): una fila de la grilla. */
export interface FranjaSemanal {
  id: string;
  nombre: string;
  horaDesde: string | null;
  horaHasta: string | null;
  orden: number;
  /** Las comidas de esa franja en TODA la semana (cada una sabe su día). */
  comidas: ComidaSemanal[];
}

export interface PropiedadesPlanSemanal {
  id: string;
  nombre: string;
  descripcion: string | null;
  franjas: FranjaSemanal[];
  creadoEn: Date;
  actualizadoEn: Date;
}

// --- Datos de entrada --------------------------------------------------------

export interface DatosItemComidaSemanal {
  nombre: string;
  cantidadGramos?: number | null;
  caloriasPor100?: number | null;
  proteinasPor100?: number | null;
  carbohidratosPor100?: number | null;
  grasasPor100?: number | null;
  fuente?: string | null;
  referenciaExterna?: string | null;
}

export interface DatosComidaSemanal {
  dia: DiaSemana;
  descripcion?: string | null;
  recetaId?: string | null;
  porciones?: number | null;
  items?: DatosItemComidaSemanal[];
}

export interface DatosFranjaSemanal {
  nombre: string;
  horaDesde?: string | null;
  horaHasta?: string | null;
  /**
   * Las comidas de la franja, en el orden en que llegan. El orden DENTRO de
   * cada día es el que decide cuál es la principal.
   */
  comidas?: DatosComidaSemanal[];
}

export interface DatosNuevoPlanSemanal {
  nombre: string;
  descripcion?: string | null;
  franjas: DatosFranjaSemanal[];
}

/** Total de un día, con la comida principal de cada franja. */
export interface TotalDelDia {
  dia: DiaSemana;
  macros: Macros;
}

/**
 * Entidad de dominio PlanSemanal (raíz de agregado): el menú de referencia de
 * una semana completa —siete días × las franjas que use el consultorio—, con
 * alternativas por celda y macros calculados.
 *
 * ## En qué se diferencia de un PlanNutricional
 *
 * Un `PlanNutricional` describe un DÍA TIPO: franjas con opciones
 * intercambiables que valen para cualquier día. Un `PlanSemanal` describe la
 * SEMANA: qué se come el lunes al mediodía y qué el martes, que no son lo
 * mismo. Conviven a propósito —el plan fija la pauta, el semanal la baja al
 * menú— y por eso un paciente puede tener los dos a la vez.
 *
 * ## Qué suma al día
 *
 * La comida de `orden` 0 de cada franja. Las demás son ALTERNATIVAS suyas
 * («o esto, o esto otro»), no comidas adicionales.
 *
 * Los macros de una comida son los de sus alimentos MÁS los de la receta
 * vinculada por sus porciones: una comida puede ser «la receta X más una
 * fruta» y las dos partes cuentan.
 *
 * Invariantes: nombre obligatorio; al menos una franja, cada una con nombre;
 * horas en HH:mm; al menos una comida cargada en toda la semana; cada comida
 * con algún contenido (texto, receta o alimentos); cantidades no negativas.
 */
export class PlanSemanal {
  private constructor(private readonly props: PropiedadesPlanSemanal) {}

  static crear(
    datos: DatosNuevoPlanSemanal,
    id: string,
    generarId: () => string,
    ahora: Date = new Date(),
  ): PlanSemanal {
    const nombre = datos.nombre?.trim() ?? "";
    if (nombre.length === 0) {
      throw new ErrorValidacion("El plan semanal debe tener un nombre.");
    }
    if (!datos.franjas || datos.franjas.length === 0) {
      throw new ErrorValidacion(
        "El plan semanal debe tener al menos una franja (Desayuno, Almuerzo…).",
      );
    }

    const franjas: FranjaSemanal[] = datos.franjas.map(
      (franja, indiceFranja) => {
        const nombreFranja = franja.nombre?.trim() ?? "";
        if (nombreFranja.length === 0) {
          throw new ErrorValidacion("Cada franja debe tener un nombre.");
        }
        validarHora(franja.horaDesde, nombreFranja);
        validarHora(franja.horaHasta, nombreFranja);

        // El orden dentro de cada día es el de llegada, numerado por día: así
        // la primera comida de cada celda es la principal y las que siguen son
        // sus alternativas.
        const ordenPorDia = new Map<DiaSemana, number>();
        const comidas: ComidaSemanal[] = (franja.comidas ?? [])
          .map((comida) => normalizarComida(comida, nombreFranja, generarId))
          .filter((comida): comida is Omit<ComidaSemanal, "orden"> =>
            Boolean(comida),
          )
          .map((comida) => {
            const orden = ordenPorDia.get(comida.dia) ?? 0;
            ordenPorDia.set(comida.dia, orden + 1);
            return { ...comida, orden };
          });

        return {
          id: generarId(),
          nombre: nombreFranja,
          horaDesde: franja.horaDesde || null,
          horaHasta: franja.horaHasta || null,
          orden: indiceFranja,
          comidas,
        };
      },
    );

    const cantidadComidas = franjas.reduce(
      (total, franja) => total + franja.comidas.length,
      0,
    );
    if (cantidadComidas === 0) {
      throw new ErrorValidacion(
        "El plan semanal debe tener al menos una comida cargada.",
      );
    }

    return new PlanSemanal({
      id,
      nombre,
      descripcion: datos.descripcion?.trim() || null,
      franjas,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesPlanSemanal): PlanSemanal {
    return new PlanSemanal(props);
  }

  /**
   * Versión actualizada e inmutable: reemplaza el contenido completo
   * (franjas, comidas y alimentos) preservando id y creadoEn.
   *
   * Reemplaza y no fusiona por lo mismo que el plan nutricional: quien edita
   * manda la grilla que quiere que quede, incluidas las celdas que no tocó.
   */
  actualizar(
    datos: DatosNuevoPlanSemanal,
    generarId: () => string,
    ahora: Date = new Date(),
  ): PlanSemanal {
    const actualizado = PlanSemanal.crear(
      datos,
      this.props.id,
      generarId,
      ahora,
    );
    return new PlanSemanal({
      ...actualizado.aPrimitivos(),
      creadoEn: this.props.creadoEn,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get nombre(): string {
    return this.props.nombre;
  }
  get franjas(): ReadonlyArray<FranjaSemanal> {
    return this.props.franjas;
  }

  /** Las comidas de una celda (franja × día), la principal primero. */
  comidasDe(franjaId: string, dia: DiaSemana): ComidaSemanal[] {
    const franja = this.props.franjas.find((f) => f.id === franjaId);
    if (!franja) return [];
    return franja.comidas
      .filter((comida) => comida.dia === dia)
      .sort((a, b) => a.orden - b.orden);
  }

  /**
   * Macros de una comida: sus alimentos MÁS la receta vinculada, escalada por
   * sus porciones.
   */
  static macrosDe(comida: ComidaSemanal): Macros {
    const deItems = sumarPorGramos(comida.items);
    const deReceta = comida.recetaMacros
      ? escalarMacros(comida.recetaMacros, comida.porciones ?? 1)
      : MACROS_VACIOS;
    return sumarMacros(deItems, deReceta);
  }

  /**
   * Total de cada día de la semana, sumando la comida PRINCIPAL de cada franja.
   *
   * Devuelve los siete días siempre, incluidos los vacíos: la comparación
   * contra las metas del paciente tiene que poder decir «el domingo no está
   * cargado», y una lista que se saltea los días vacíos no se distingue de una
   * en la que ese día no existe.
   */
  totalesPorDia(): TotalDelDia[] {
    return DIAS_SEMANA.map((dia) => ({
      dia,
      macros: sumarTodos(
        this.props.franjas
          .map((franja) => principalDelDia(franja, dia))
          .filter((comida): comida is ComidaSemanal => comida !== null)
          .map((comida) => PlanSemanal.macrosDe(comida)),
      ),
    }));
  }

  aPrimitivos(): PropiedadesPlanSemanal {
    return {
      ...this.props,
      franjas: this.props.franjas.map((franja) => ({
        ...franja,
        comidas: franja.comidas.map((comida) => ({
          ...comida,
          recetaMacros: comida.recetaMacros ? { ...comida.recetaMacros } : null,
          items: comida.items.map((item) => ({ ...item })),
        })),
      })),
    };
  }
}

/** La comida que rige ese día en esa franja: la de menor orden. */
function principalDelDia(
  franja: FranjaSemanal,
  dia: DiaSemana,
): ComidaSemanal | null {
  let principal: ComidaSemanal | null = null;
  for (const comida of franja.comidas) {
    if (comida.dia !== dia) continue;
    if (principal === null || comida.orden < principal.orden) {
      principal = comida;
    }
  }
  return principal;
}

/**
 * Normaliza una comida, o devuelve `null` si está vacía.
 *
 * Una celda sin texto, sin receta y sin alimentos NO es un error: es una celda
 * que el profesional dejó en blanco, y la grilla manda las 42 celdas siempre.
 * Descartarlas acá es lo que evita que el plan guarde decenas de filas vacías.
 */
function normalizarComida(
  datos: DatosComidaSemanal,
  franja: string,
  generarId: () => string,
): Omit<ComidaSemanal, "orden"> | null {
  if (!DIAS_SEMANA.includes(datos.dia)) {
    throw new ErrorValidacion(`«${datos.dia}» no es un día de la semana.`);
  }
  const descripcion = datos.descripcion?.trim() || null;
  const recetaId = datos.recetaId || null;
  const items = normalizarItems(datos.items, franja, generarId);
  if (descripcion === null && recetaId === null && items.length === 0) {
    return null;
  }
  if (
    datos.porciones != null &&
    (!Number.isFinite(datos.porciones) || datos.porciones <= 0)
  ) {
    throw new ErrorValidacion(
      `Las porciones de la receta en «${franja}» deben ser mayores que cero.`,
    );
  }
  return {
    id: generarId(),
    dia: datos.dia,
    descripcion,
    recetaId,
    // El nombre y los macros de la receta los completa el repositorio al leer,
    // igual que en las opciones de un plan: acá solo se conoce el id.
    recetaNombre: null,
    recetaMacros: null,
    porciones: recetaId ? (datos.porciones ?? 1) : null,
    items,
  };
}

function normalizarItems(
  valores: DatosItemComidaSemanal[] | undefined,
  franja: string,
  generarId: () => string,
): ItemDeComidaSemanal[] {
  return (valores ?? [])
    .map((item) => {
      const nombre = item.nombre?.trim() ?? "";
      const etiqueta = nombre || franja;
      return {
        id: generarId(),
        nombre,
        cantidadGramos: noNegativo(
          item.cantidadGramos,
          `La cantidad de «${etiqueta}»`,
        ),
        caloriasPor100: noNegativo(
          item.caloriasPor100,
          `Las calorías de «${etiqueta}»`,
        ),
        proteinasPor100: noNegativo(
          item.proteinasPor100,
          `Las proteínas de «${etiqueta}»`,
        ),
        carbohidratosPor100: noNegativo(
          item.carbohidratosPor100,
          `Los carbohidratos de «${etiqueta}»`,
        ),
        grasasPor100: noNegativo(
          item.grasasPor100,
          `Las grasas de «${etiqueta}»`,
        ),
        fuente: item.fuente?.trim() || null,
        referenciaExterna: item.referenciaExterna?.trim() || null,
        orden: 0,
      };
    })
    .filter((item) => item.nombre.length > 0)
    .map((item, indice) => ({ ...item, orden: indice }));
}

function noNegativo(
  valor: number | null | undefined,
  etiqueta: string,
): number | null {
  if (valor == null) return null;
  if (!Number.isFinite(valor) || valor < 0) {
    throw new ErrorValidacion(`${etiqueta} no puede ser negativa.`);
  }
  return valor;
}

function validarHora(hora: string | null | undefined, franja: string): void {
  if (hora != null && hora !== "" && !PATRON_HORA.test(hora)) {
    throw new ErrorValidacion(
      `La hora de «${franja}» debe tener formato HH:mm.`,
    );
  }
}
