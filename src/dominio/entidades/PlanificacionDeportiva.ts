import { ErrorValidacion } from "../errores/ErrorValidacion";
import {
  normalizarCantidadDeAlimento,
  type CantidadDeAlimento,
  type DatosCantidadDeAlimento,
} from "./medidasAlimento";
import {
  sumarPorGramos,
  redondear1,
  MACROS_VACIOS,
  type Macros,
} from "../servicios/macrosAlimentos";

// --- Vocabulario -------------------------------------------------------------

/**
 * De qué deporte es una planificación (migración 94). Empieza con las
 * carreras; cada deporte nuevo trae sus propios datos (como `DetalleCarrera`)
 * y comparte la línea de tiempo de ingestas. Los valores solo se agregan.
 */
export const TIPOS_PLANIFICACION = ["CARRERA"] as const;
export type TipoPlanificacion = (typeof TIPOS_PLANIFICACION)[number];

export const ETIQUETA_TIPO_PLANIFICACION: Record<TipoPlanificacion, string> = {
  CARRERA: "Carrera (running y trail)",
};

/** Carrera de calle (running) o de montaña (trail running). */
export const MODALIDADES_CARRERA = ["CALLE", "TRAIL"] as const;
export type ModalidadCarrera = (typeof MODALIDADES_CARRERA)[number];

export const ETIQUETA_MODALIDAD_CARRERA: Record<ModalidadCarrera, string> = {
  CALLE: "Running (calle)",
  TRAIL: "Trail running",
};

/** Hasta cuánto antes de la largada puede ir una ingesta: 12 h (la cena previa no, el desayuno sí). */
export const MINUTOS_MAXIMOS_ANTES_DE_LARGAR = 720;
/** Una carrera de hasta 7 días cubre los ultra por etapas sin dejar pasar un error de tipeo. */
export const DURACION_MAXIMA_CARRERA_MIN = 10_080;
export const DISTANCIA_MAXIMA_CARRERA_KM = 1000;
export const MAXIMO_INGESTAS = 200;
export const MAXIMO_ALIMENTOS_POR_INGESTA = 20;
/** Margen para leer un objetivo por hora como cumplido: ±10 %, como las metas aproximadas. */
export const TOLERANCIA_OBJETIVO = 0.1;

/**
 * El rango de cafeína que usan las guías para el rendimiento (consenso del
 * COI 2018 y posición de la ISSN): 3 a 6 mg por kg de peso. Por encima no
 * mejora el rendimiento y crecen los efectos adversos; la pantalla lo avisa,
 * no lo impide (la dosis la decide el profesional).
 */
export const CAFEINA_MG_KG_HABITUAL = { minimo: 3, maximo: 6 } as const;

/** Peso del deportista admitido para el mg/kg. */
export const PESO_MINIMO_KG = 20;
export const PESO_MAXIMO_KG = 300;

const PATRON_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

// --- Estado persistido -------------------------------------------------------

/** Los datos de una CARRERA. La duración estimada es la que da los totales por hora. */
export interface DetalleCarrera {
  modalidad: ModalidadCarrera;
  distanciaKm: number;
  duracionEstimadaMin: number;
  desnivelPositivoM: number | null;
  desnivelNegativoM: number | null;
  /** HH:mm. Con ella, cada ingesta dice también la hora del día. */
  horaLargada: string | null;
  temperaturaEstimadaC: number | null;
  /** Objetivos por hora de carrera. */
  carbohidratosObjetivoGH: number | null;
  liquidosObjetivoMlH: number | null;
  /** Informativo: los alimentos no traen sodio y no se suma. */
  sodioObjetivoMgH: number | null;
  puestosAbastecimiento: string | null;
  estrategiaPrevia: string | null;
  recuperacion: string | null;
}

/**
 * Un alimento de una ingesta: la misma COPIA que guardan las comidas del plan
 * semanal. `cantidadGramos` es la cantidad en la unidad base (ml para un
 * líquido), y es la que suma macros y, si es en ml, líquidos.
 */
export interface AlimentoDeIngesta extends CantidadDeAlimento {
  id: string;
  nombre: string;
  caloriasPor100: number | null;
  proteinasPor100: number | null;
  carbohidratosPor100: number | null;
  grasasPor100: number | null;
  /** mg de cafeína por 100 g/ml, copiados del alimento (migración 96). */
  cafeinaPor100: number | null;
  fuente: string | null;
  referenciaExterna: string | null;
  /** Id del alimento del que se copió (migración 85): solo dice dónde se usa. */
  alimentoOrigenId: string | null;
  orden: number;
}

/**
 * Un MOMENTO de ingesta: cuándo (minutos desde la largada; negativo = antes
 * de largar) y, opcional, en qué kilómetro, con lo que se toma ahí. Un gel con
 * 150 ml de agua es una sola ingesta.
 */
export interface Ingesta {
  id: string;
  minuto: number;
  km: number | null;
  notas: string | null;
  orden: number;
  alimentos: AlimentoDeIngesta[];
}

export interface PropiedadesPlanificacionDeportiva {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: TipoPlanificacion;
  grupoId: string | null;
  /**
   * Peso del deportista (kg) para la cafeína en mg/kg (migración 96). Es de
   * la planificación: una general se asigna a varios pacientes.
   */
  pesoReferenciaKg: number | null;
  /** Presente si y solo si el tipo es CARRERA. */
  carrera: DetalleCarrera | null;
  /** En orden de tiempo. */
  ingestas: Ingesta[];
  creadoEn: Date;
  actualizadoEn: Date;
}

// --- Datos de entrada --------------------------------------------------------

export interface DatosCarrera {
  modalidad?: ModalidadCarrera | null;
  distanciaKm: number;
  duracionEstimadaMin: number;
  desnivelPositivoM?: number | null;
  desnivelNegativoM?: number | null;
  horaLargada?: string | null;
  temperaturaEstimadaC?: number | null;
  carbohidratosObjetivoGH?: number | null;
  liquidosObjetivoMlH?: number | null;
  sodioObjetivoMgH?: number | null;
  puestosAbastecimiento?: string | null;
  estrategiaPrevia?: string | null;
  recuperacion?: string | null;
}

export interface DatosAlimentoIngesta extends DatosCantidadDeAlimento {
  nombre: string;
  caloriasPor100?: number | null;
  proteinasPor100?: number | null;
  carbohidratosPor100?: number | null;
  grasasPor100?: number | null;
  cafeinaPor100?: number | null;
  fuente?: string | null;
  referenciaExterna?: string | null;
  alimentoOrigenId?: string | null;
}

export interface DatosIngesta {
  minuto: number;
  km?: number | null;
  notas?: string | null;
  alimentos?: DatosAlimentoIngesta[];
}

export interface DatosPlanificacion {
  nombre: string;
  descripcion?: string | null;
  pesoReferenciaKg?: number | null;
  carrera?: DatosCarrera | null;
  ingestas?: DatosIngesta[];
}

export interface DatosNuevaPlanificacion extends DatosPlanificacion {
  tipo: TipoPlanificacion;
  grupoId?: string | null;
}

// --- Lo que se calcula -------------------------------------------------------

/** Cómo quedó un valor por hora frente a su objetivo (±10 %). */
export type EstadoObjetivo = "DEBAJO" | "CUMPLE" | "ENCIMA";

/** Lo que suman las ingestas de una planificación. Nada de esto se guarda. */
export interface ResumenIngestas {
  /**
   * Lo que se toma DURANTE la carrera: las ingestas entre la largada (minuto
   * 0) y la llegada estimada. Son las que cuentan para los objetivos por hora.
   */
  durante: {
    cantidad: number;
    macros: Macros;
    /** ml de los alimentos medidos en mililitros (agua, isotónica). */
    liquidosMl: number | null;
    porHora: {
      calorias: number | null;
      carbohidratosG: number | null;
      liquidosMl: number | null;
    };
  };
  /** Lo que se toma antes de largar (minutos negativos). */
  antes: { cantidad: number; macros: Macros; liquidosMl: number | null };
  /** Contra los objetivos por hora; null si no hay objetivo o no hay dato. */
  carbohidratos: EstadoObjetivo | null;
  liquidos: EstadoObjetivo | null;
  /**
   * El lapso más largo sin ingerir nada durante la carrera, contando desde la
   * largada y hasta la llegada estimada (min). Null sin duración.
   */
  intervaloMaximoMin: number | null;
  /**
   * La cafeína de la competencia entera (migración 96). Null en cada valor es
   * SIN DATO: ningún alimento trae cafeína cargada.
   */
  cafeina: {
    /** mg antes de largar. */
    antesMg: number | null;
    /** mg durante la carrera. */
    duranteMg: number | null;
    /** mg de antes y durante: la dosis de la competencia. */
    totalMg: number | null;
    /** mg por hora de carrera (solo lo de durante). */
    porHoraMg: number | null;
    /** El total por kg del peso del deportista; null sin peso o sin dato. */
    mgPorKg: number | null;
  };
}

/**
 * Entidad de dominio PlanificacionDeportiva (raíz de agregado): la estrategia
 * nutricional de una competencia —qué se ingiere y CUÁNDO—, empezando por las
 * carreras de running y trail (migración 94).
 *
 * ## En qué se diferencia de un plan
 *
 * Un `PlanNutricional` describe la alimentación de un día; un `PlanSemanal`,
 * la de una semana. Esta describe UN EVENTO: una línea de tiempo con minutos
 * de carrera, objetivos por hora y lo que hay que tomar en cada momento. Se
 * gestiona como un plan (carpetas, asignación a pacientes), pero es otra cosa
 * y por eso es otro agregado.
 *
 * ## Qué suma
 *
 * Los alimentos de las ingestas que caen entre la largada y la llegada
 * estimada, divididos por la duración estimada: esos son los g/h de
 * carbohidratos y los ml/h de líquidos que se comparan con los objetivos. Lo
 * de antes de largar se muestra aparte y no cuenta para la hora de carrera.
 *
 * Invariantes: nombre obligatorio; una carrera tiene distancia y duración
 * positivas; ninguna ingesta cae después de la llegada estimada ni más de 12 h
 * antes de largar, ni en un kilómetro fuera de la carrera; cada ingesta lleva
 * algún alimento o una nota; cantidades y macros no negativos.
 */
export class PlanificacionDeportiva {
  private constructor(
    private readonly props: PropiedadesPlanificacionDeportiva,
  ) {}

  static crear(
    datos: DatosNuevaPlanificacion,
    id: string,
    generarId: () => string,
    ahora: Date = new Date(),
  ): PlanificacionDeportiva {
    if (!TIPOS_PLANIFICACION.includes(datos.tipo)) {
      throw new ErrorValidacion("El tipo de planificación no es válido.");
    }
    return new PlanificacionDeportiva({
      id,
      tipo: datos.tipo,
      grupoId: datos.grupoId ?? null,
      ...normalizar(datos.tipo, datos, generarId),
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(
    props: PropiedadesPlanificacionDeportiva,
  ): PlanificacionDeportiva {
    return new PlanificacionDeportiva(props);
  }

  /**
   * Versión editada: el contenido se reemplaza entero, como en los planes. El
   * TIPO no cambia —pasar una carrera a otro deporte tiraría sus datos— y la
   * carpeta tampoco: moverla es otra operación (`conGrupo`).
   */
  actualizar(
    datos: DatosPlanificacion,
    generarId: () => string,
    ahora: Date = new Date(),
  ): PlanificacionDeportiva {
    return new PlanificacionDeportiva({
      ...this.props,
      ...normalizar(this.props.tipo, datos, generarId),
      actualizadoEn: ahora,
    });
  }

  /** Copia completa con otro id y otro nombre, en la misma carpeta. */
  duplicar(
    id: string,
    nombre: string,
    generarId: () => string,
    ahora: Date = new Date(),
  ): PlanificacionDeportiva {
    return PlanificacionDeportiva.crear(
      {
        tipo: this.props.tipo,
        grupoId: this.props.grupoId,
        nombre,
        descripcion: this.props.descripcion,
        pesoReferenciaKg: this.props.pesoReferenciaKg,
        carrera: this.props.carrera,
        ingestas: this.props.ingestas.map((ingesta) => ({
          minuto: ingesta.minuto,
          km: ingesta.km,
          notas: ingesta.notas,
          alimentos: ingesta.alimentos.map((alimento) => ({ ...alimento })),
        })),
      },
      id,
      generarId,
      ahora,
    );
  }

  /** Copia en otra carpeta (o suelta, con null). */
  conGrupo(grupoId: string | null): PlanificacionDeportiva {
    return new PlanificacionDeportiva({ ...this.props, grupoId });
  }

  get id(): string {
    return this.props.id;
  }
  get nombre(): string {
    return this.props.nombre;
  }
  get tipo(): TipoPlanificacion {
    return this.props.tipo;
  }
  get grupoId(): string | null {
    return this.props.grupoId;
  }
  get carrera(): DetalleCarrera | null {
    return this.props.carrera;
  }
  get ingestas(): Ingesta[] {
    return this.props.ingestas;
  }

  /** Minutos por kilómetro al ritmo de la duración estimada, o null. */
  get ritmoMinPorKm(): number | null {
    const c = this.props.carrera;
    if (!c || c.distanciaKm <= 0) return null;
    return Math.round((c.duracionEstimadaMin / c.distanciaKm) * 100) / 100;
  }

  /** Lo que suman las ingestas, por hora de carrera y contra los objetivos. */
  get resumen(): ResumenIngestas {
    const duracion = this.props.carrera?.duracionEstimadaMin ?? null;
    const durante = this.props.ingestas.filter(
      (i) => i.minuto >= 0 && (duracion == null || i.minuto <= duracion),
    );
    const antes = this.props.ingestas.filter((i) => i.minuto < 0);

    const macrosDurante = sumarIngestas(durante);
    const liquidosDurante = liquidosDe(durante);
    const horas = duracion != null && duracion > 0 ? duracion / 60 : null;
    const porHora = (valor: number | null): number | null =>
      valor != null && horas != null ? redondear1(valor / horas) : null;
    const porHoraCalorias = porHora(macrosDurante.calorias);

    return {
      durante: {
        cantidad: durante.length,
        macros: macrosDurante,
        liquidosMl: liquidosDurante,
        porHora: {
          calorias:
            porHoraCalorias != null ? Math.round(porHoraCalorias) : null,
          carbohidratosG: porHora(macrosDurante.carbohidratosG),
          liquidosMl: (() => {
            const v = porHora(liquidosDurante);
            return v != null ? Math.round(v) : null;
          })(),
        },
      },
      antes: {
        cantidad: antes.length,
        macros: sumarIngestas(antes),
        liquidosMl: liquidosDe(antes),
      },
      carbohidratos: compararConObjetivo(
        porHora(macrosDurante.carbohidratosG),
        this.props.carrera?.carbohidratosObjetivoGH ?? null,
      ),
      liquidos: compararConObjetivo(
        porHora(liquidosDurante),
        this.props.carrera?.liquidosObjetivoMlH ?? null,
      ),
      intervaloMaximoMin: intervaloMaximo(durante, duracion),
      cafeina: resumenCafeina(
        cafeinaDe(antes),
        cafeinaDe(durante),
        horas,
        this.props.pesoReferenciaKg,
      ),
    };
  }

  aPrimitivos(): PropiedadesPlanificacionDeportiva {
    return {
      ...this.props,
      carrera: this.props.carrera ? { ...this.props.carrera } : null,
      ingestas: this.props.ingestas.map((ingesta) => ({
        ...ingesta,
        alimentos: ingesta.alimentos.map((alimento) => ({
          ...alimento,
          medidas: [...alimento.medidas],
        })),
      })),
    };
  }
}

// --- Cálculos sueltos (los usa también el servicio para cada ingesta) ---------

/** Macros de UNA ingesta: la suma de sus alimentos. */
export function macrosDeIngesta(ingesta: Pick<Ingesta, "alimentos">): Macros {
  return sumarPorGramos(ingesta.alimentos);
}

/** ml de UNA ingesta: sus alimentos medidos en mililitros. Null si no hay ninguno. */
export function liquidosDeIngesta(
  ingesta: Pick<Ingesta, "alimentos">,
): number | null {
  const liquidos = ingesta.alimentos.filter(
    (a) => a.unidadBase === "MILILITRO" && a.cantidadGramos != null,
  );
  if (liquidos.length === 0) return null;
  return Math.round(
    liquidos.reduce((total, a) => total + (a.cantidadGramos ?? 0), 0),
  );
}

/**
 * mg de cafeína de UNA ingesta: cantidad × cafeína por 100 de cada alimento
 * que la trae. Null si ninguno trae el dato.
 */
export function cafeinaDeIngesta(
  ingesta: Pick<Ingesta, "alimentos">,
): number | null {
  let total = 0;
  let hay = false;
  for (const a of ingesta.alimentos) {
    if (a.cafeinaPor100 == null || a.cantidadGramos == null) continue;
    if (a.cantidadGramos <= 0) continue;
    total += (a.cafeinaPor100 * a.cantidadGramos) / 100;
    hay = true;
  }
  return hay ? redondear1(total) : null;
}

/**
 * El bloque de cafeína del resumen: lo de antes y lo de durante por separado,
 * el total de la competencia, el ritmo por hora de carrera y el total por kg.
 * Lo comparten el dominio y el espejo del formulario, que le pasa sus sumas.
 */
export function resumenCafeina(
  antesMg: number | null,
  duranteMg: number | null,
  horas: number | null,
  pesoKg: number | null,
): ResumenIngestas["cafeina"] {
  const totalMg =
    antesMg == null && duranteMg == null
      ? null
      : redondear1((antesMg ?? 0) + (duranteMg ?? 0));
  return {
    antesMg,
    duranteMg,
    totalMg,
    porHoraMg:
      duranteMg != null && horas != null && horas > 0
        ? Math.round(duranteMg / horas)
        : null,
    mgPorKg:
      totalMg != null && pesoKg != null && pesoKg > 0
        ? redondear1(totalMg / pesoKg)
        : null,
  };
}

/**
 * La hora del día de una ingesta, con la hora de largada: «07:00» + 95 min →
 * «08:35». Da la vuelta al día (una ultra que larga a las 22:00). Null sin
 * hora de largada.
 */
export function horaDeIngesta(
  horaLargada: string | null,
  minuto: number,
): string | null {
  if (!horaLargada || !PATRON_HORA.test(horaLargada)) return null;
  const [h, m] = horaLargada.split(":").map(Number);
  const total = (((h! * 60 + m! + minuto) % 1440) + 1440) % 1440;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * En qué kilómetro cae una ingesta si se corre a ritmo parejo: minuto /
 * duración × distancia. Solo tiene sentido en calle; en trail el desnivel
 * hace que el ritmo no sea parejo, y un km estimado así engaña.
 */
export function kmEstimadoDeIngesta(
  carrera: DetalleCarrera | null,
  minuto: number,
): number | null {
  if (!carrera || carrera.modalidad !== "CALLE" || minuto < 0) return null;
  if (carrera.duracionEstimadaMin <= 0) return null;
  return redondear1(
    (minuto / carrera.duracionEstimadaMin) * carrera.distanciaKm,
  );
}

/** Un valor por hora frente a su objetivo, con ±10 % de margen. */
export function compararConObjetivo(
  valor: number | null,
  objetivo: number | null,
): EstadoObjetivo | null {
  if (valor == null || objetivo == null || objetivo <= 0) return null;
  if (valor < objetivo * (1 - TOLERANCIA_OBJETIVO)) return "DEBAJO";
  if (valor > objetivo * (1 + TOLERANCIA_OBJETIVO)) return "ENCIMA";
  return "CUMPLE";
}

function sumarIngestas(ingestas: Ingesta[]): Macros {
  if (ingestas.length === 0) return { ...MACROS_VACIOS };
  return sumarPorGramos(ingestas.flatMap((i) => i.alimentos));
}

function cafeinaDe(ingestas: Ingesta[]): number | null {
  const valores = ingestas
    .map(cafeinaDeIngesta)
    .filter((v): v is number => v != null);
  return valores.length > 0
    ? redondear1(valores.reduce((a, b) => a + b, 0))
    : null;
}

function liquidosDe(ingestas: Ingesta[]): number | null {
  const valores = ingestas
    .map(liquidosDeIngesta)
    .filter((v): v is number => v != null);
  return valores.length > 0 ? valores.reduce((a, b) => a + b, 0) : null;
}

function intervaloMaximo(
  durante: Ingesta[],
  duracion: number | null,
): number | null {
  if (duracion == null || duracion <= 0) return null;
  const puntos = [0, ...durante.map((i) => i.minuto), duracion].sort(
    (a, b) => a - b,
  );
  let maximo = 0;
  for (let i = 1; i < puntos.length; i++) {
    maximo = Math.max(maximo, puntos[i]! - puntos[i - 1]!);
  }
  return maximo;
}

// --- Normalización -----------------------------------------------------------

function normalizar(
  tipo: TipoPlanificacion,
  datos: DatosPlanificacion,
  generarId: () => string,
): Pick<
  PropiedadesPlanificacionDeportiva,
  "nombre" | "descripcion" | "pesoReferenciaKg" | "carrera" | "ingestas"
> {
  const nombre = datos.nombre?.trim() ?? "";
  if (nombre.length === 0) {
    throw new ErrorValidacion("La planificación debe tener un nombre.");
  }
  if (nombre.length > 120) {
    throw new ErrorValidacion(
      "El nombre de la planificación no puede superar los 120 caracteres.",
    );
  }

  const carrera =
    tipo === "CARRERA" ? normalizarCarrera(datos.carrera ?? null) : null;

  const ingestas = datos.ingestas ?? [];
  if (ingestas.length > MAXIMO_INGESTAS) {
    throw new ErrorValidacion(
      `Una planificación admite hasta ${MAXIMO_INGESTAS} ingestas.`,
    );
  }

  return {
    nombre,
    descripcion: texto(datos.descripcion),
    pesoReferenciaKg: peso(datos.pesoReferenciaKg),
    carrera,
    ingestas: ingestas
      .map((ingesta, indice) => ({
        ingesta: normalizarIngesta(ingesta, carrera, generarId),
        indice,
      }))
      // En orden de tiempo; a igual minuto, en el orden en que llegaron.
      .sort(
        (a, b) => a.ingesta.minuto - b.ingesta.minuto || a.indice - b.indice,
      )
      .map(({ ingesta }, orden) => ({ ...ingesta, orden })),
  };
}

function normalizarCarrera(datos: DatosCarrera | null): DetalleCarrera {
  if (!datos) {
    throw new ErrorValidacion(
      "Una planificación de carrera necesita la distancia y la duración estimada.",
    );
  }
  const modalidad = datos.modalidad ?? "CALLE";
  if (!MODALIDADES_CARRERA.includes(modalidad)) {
    throw new ErrorValidacion("La modalidad de la carrera no es válida.");
  }
  const distanciaKm = datos.distanciaKm;
  if (
    !Number.isFinite(distanciaKm) ||
    distanciaKm <= 0 ||
    distanciaKm > DISTANCIA_MAXIMA_CARRERA_KM
  ) {
    throw new ErrorValidacion(
      `La distancia tiene que ser mayor que 0 y de hasta ${DISTANCIA_MAXIMA_CARRERA_KM} km.`,
    );
  }
  const duracion = datos.duracionEstimadaMin;
  if (
    !Number.isInteger(duracion) ||
    duracion <= 0 ||
    duracion > DURACION_MAXIMA_CARRERA_MIN
  ) {
    throw new ErrorValidacion(
      "La duración estimada tiene que ser un tiempo mayor que 0 (y de hasta 7 días).",
    );
  }
  const horaLargada = texto(datos.horaLargada);
  if (horaLargada && !PATRON_HORA.test(horaLargada)) {
    throw new ErrorValidacion(
      "La hora de largada debe tener el formato HH:mm.",
    );
  }
  const temperatura = datos.temperaturaEstimadaC ?? null;
  if (
    temperatura != null &&
    (!Number.isFinite(temperatura) || temperatura < -40 || temperatura > 60)
  ) {
    throw new ErrorValidacion("La temperatura estimada no es razonable.");
  }

  return {
    modalidad,
    distanciaKm: Math.round(distanciaKm * 100) / 100,
    duracionEstimadaMin: duracion,
    desnivelPositivoM: entero(
      datos.desnivelPositivoM,
      "El desnivel positivo",
      20_000,
    ),
    desnivelNegativoM: entero(
      datos.desnivelNegativoM,
      "El desnivel negativo",
      20_000,
    ),
    horaLargada,
    temperaturaEstimadaC: temperatura != null ? redondear1(temperatura) : null,
    carbohidratosObjetivoGH: positivo(
      datos.carbohidratosObjetivoGH,
      "El objetivo de carbohidratos por hora",
      300,
    ),
    liquidosObjetivoMlH: entero(
      datos.liquidosObjetivoMlH,
      "El objetivo de líquidos por hora",
      3000,
    ),
    sodioObjetivoMgH: entero(
      datos.sodioObjetivoMgH,
      "El objetivo de sodio por hora",
      5000,
    ),
    puestosAbastecimiento: texto(datos.puestosAbastecimiento),
    estrategiaPrevia: texto(datos.estrategiaPrevia),
    recuperacion: texto(datos.recuperacion),
  };
}

function normalizarIngesta(
  datos: DatosIngesta,
  carrera: DetalleCarrera | null,
  generarId: () => string,
): Omit<Ingesta, "orden"> {
  const minuto = datos.minuto;
  if (!Number.isInteger(minuto)) {
    throw new ErrorValidacion(
      "El momento de cada ingesta va en minutos enteros.",
    );
  }
  if (minuto < -MINUTOS_MAXIMOS_ANTES_DE_LARGAR) {
    throw new ErrorValidacion(
      "Una ingesta no puede ir más de 12 horas antes de la largada.",
    );
  }
  if (carrera && minuto > carrera.duracionEstimadaMin) {
    throw new ErrorValidacion(
      `Hay una ingesta después de la llegada estimada (${formatearMinutos(minuto)} de carrera). Lo de después de llegar va en «Recuperación».`,
    );
  }

  const km = datos.km ?? null;
  if (km != null) {
    if (!Number.isFinite(km) || km < 0) {
      throw new ErrorValidacion(
        "El kilómetro de una ingesta no puede ser negativo.",
      );
    }
    if (carrera && km > carrera.distanciaKm) {
      throw new ErrorValidacion(
        `Hay una ingesta en el km ${km}, después de la llegada (${carrera.distanciaKm} km).`,
      );
    }
  }

  const alimentosDatos = datos.alimentos ?? [];
  if (alimentosDatos.length > MAXIMO_ALIMENTOS_POR_INGESTA) {
    throw new ErrorValidacion(
      `Una ingesta admite hasta ${MAXIMO_ALIMENTOS_POR_INGESTA} alimentos.`,
    );
  }
  const alimentos = alimentosDatos.map((alimento, orden) =>
    normalizarAlimento(alimento, orden, generarId),
  );
  const notas = texto(datos.notas);
  if (alimentos.length === 0 && !notas) {
    throw new ErrorValidacion(
      `La ingesta de los ${formatearMinutos(minuto)} no tiene alimentos ni indicaciones.`,
    );
  }

  return {
    id: generarId(),
    minuto,
    km: km != null ? Math.round(km * 100) / 100 : null,
    notas,
    alimentos,
  };
}

function normalizarAlimento(
  datos: DatosAlimentoIngesta,
  orden: number,
  generarId: () => string,
): AlimentoDeIngesta {
  const nombre = datos.nombre?.trim() ?? "";
  if (nombre.length === 0) {
    throw new ErrorValidacion(
      "Cada alimento de una ingesta debe tener un nombre.",
    );
  }
  return {
    id: generarId(),
    nombre,
    ...normalizarCantidadDeAlimento(datos, nombre),
    caloriasPor100: macro(datos.caloriasPor100, nombre),
    proteinasPor100: macro(datos.proteinasPor100, nombre),
    carbohidratosPor100: macro(datos.carbohidratosPor100, nombre),
    grasasPor100: macro(datos.grasasPor100, nombre),
    cafeinaPor100: macro(datos.cafeinaPor100, nombre),
    fuente: texto(datos.fuente),
    referenciaExterna: texto(datos.referenciaExterna),
    alimentoOrigenId: texto(datos.alimentoOrigenId),
    orden,
  };
}

/** «1:35» para 95 minutos; «-0:30» para media hora antes de largar. */
export function formatearMinutos(minuto: number): string {
  const signo = minuto < 0 ? "-" : "";
  const absoluto = Math.abs(minuto);
  const h = Math.floor(absoluto / 60);
  const m = String(absoluto % 60).padStart(2, "0");
  return `${signo}${h}:${m}`;
}

function peso(valor: number | null | undefined): number | null {
  if (valor == null) return null;
  if (
    !Number.isFinite(valor) ||
    valor < PESO_MINIMO_KG ||
    valor > PESO_MAXIMO_KG
  ) {
    throw new ErrorValidacion(
      `El peso del deportista tiene que estar entre ${PESO_MINIMO_KG} y ${PESO_MAXIMO_KG} kg.`,
    );
  }
  return Math.round(valor * 100) / 100;
}

function texto(valor: string | null | undefined): string | null {
  const limpio = valor?.trim() ?? "";
  return limpio === "" ? null : limpio;
}

function macro(
  valor: number | null | undefined,
  alimento: string,
): number | null {
  if (valor == null) return null;
  if (!Number.isFinite(valor) || valor < 0) {
    throw new ErrorValidacion(
      `Los macros de «${alimento}» no pueden ser negativos.`,
    );
  }
  return Math.round(valor * 100) / 100;
}

function entero(
  valor: number | null | undefined,
  etiqueta: string,
  maximo: number,
): number | null {
  if (valor == null) return null;
  if (!Number.isFinite(valor) || valor < 0 || valor > maximo) {
    throw new ErrorValidacion(
      `${etiqueta} tiene que estar entre 0 y ${maximo}.`,
    );
  }
  return Math.round(valor);
}

function positivo(
  valor: number | null | undefined,
  etiqueta: string,
  maximo: number,
): number | null {
  if (valor == null) return null;
  if (!Number.isFinite(valor) || valor < 0 || valor > maximo) {
    throw new ErrorValidacion(
      `${etiqueta} tiene que estar entre 0 y ${maximo}.`,
    );
  }
  return redondear1(valor);
}
