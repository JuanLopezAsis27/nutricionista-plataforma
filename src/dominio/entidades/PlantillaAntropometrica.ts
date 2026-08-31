import { ErrorValidacion } from "../errores/ErrorValidacion";
import { ETIQUETAS_MEDIDA } from "../servicios/composicionCorporal";
import type { MedidasAntropometricas } from "./Antropometria";
import {
  DEFINICIONES_METODO,
  METODOS_GRASA,
  type MetodoGrasa,
} from "../servicios/grasaPorPliegues";

/**
 * Plantilla de medición: qué campos se piden al cargar una consulta.
 *
 * Existe porque el perfil ISAK completo son 25 medidas y en la consulta real
 * se toman seis. Pedir las 25 y dejar 19 vacías es ruido en cada carga.
 *
 * Regla dura: **una plantilla tiene que alcanzar para calcular algo.** Una
 * plantilla que no resuelve ni una ecuación de grasa ni el fraccionamiento en
 * 5 masas produce mediciones sin ningún resultado, que es exactamente lo que
 * esta función existe para evitar. Se valida al guardarla, no al usarla.
 */

/** Campos que una plantilla puede incluir (el peso va siempre, aparte). */
export const CAMPOS_PLANTILLA = [
  "tallaCm",
  "tallaSentadoCm",
  "diamBiacromial",
  "diamToraxTransverso",
  "diamToraxAnteroposterior",
  "diamBiiliocrestideo",
  "diamHumeral",
  "diamFemoral",
  "circCabeza",
  "circBrazo",
  "circBrazoContraido",
  "circAntebrazo",
  "circTorax",
  "circCinturaMinima",
  "circCinturaMaxima",
  "circCadera",
  "circMusloMaximo",
  "circMusloMedial",
  "circPantorrilla",
  "pliegueTricipital",
  "pliegueSubescapular",
  "pliegueSupraespinal",
  "pliegueAbdominal",
  "pliegueMuslo",
  "plieguePantorrilla",
  "pliegueBicipital",
  "pliegueCrestaIliaca",
  "plieguePectoral",
  "pliegueAxilarMedio",
  "pliegueLumbar",
] as const satisfies readonly (keyof MedidasAntropometricas)[];

export type CampoPlantilla = (typeof CAMPOS_PLANTILLA)[number];

/**
 * Etiquetas de los campos elegibles. Sale de las del cálculo, más las medidas
 * que se registran pero no alimentan ninguna ecuación: la cintura máxima se
 * anota por seguimiento clínico y ningún modelo la usa.
 */
export const ETIQUETAS_CAMPO_PLANTILLA: Record<CampoPlantilla, string> = {
  ...ETIQUETAS_MEDIDA,
  circCinturaMaxima: "Perímetro de cintura máxima",
};

/**
 * Medidas que exige el fraccionamiento en 5 masas de Kerr.
 * Espeja los requisitos de `composicionCorporal.ts`; si allá cambian, el test
 * de esta entidad lo detecta.
 */
const REQUERIDOS_CINCO_MASAS = [
  "tallaCm",
  "tallaSentadoCm",
  "diamBiacromial",
  "diamToraxTransverso",
  "diamToraxAnteroposterior",
  "diamBiiliocrestideo",
  "diamHumeral",
  "diamFemoral",
  "circCabeza",
  "circBrazo",
  "circAntebrazo",
  "circTorax",
  "circCinturaMinima",
  "circMusloMaximo",
  "circPantorrilla",
  "pliegueTricipital",
  "pliegueSubescapular",
  "pliegueSupraespinal",
  "pliegueAbdominal",
  "pliegueMuslo",
  "plieguePantorrilla",
] as const satisfies readonly CampoPlantilla[];

/** Los 4 pliegues de Faulkner. */
const PLIEGUES_FAULKNER = [
  "pliegueTricipital",
  "pliegueSubescapular",
  "pliegueSupraespinal",
  "pliegueAbdominal",
] as const satisfies readonly CampoPlantilla[];

/** Los 6 de Yuhasz/Carter: los de Faulkner + muslo y pantorrilla. */
const PLIEGUES_YUHASZ = [
  ...PLIEGUES_FAULKNER,
  "pliegueMuslo",
  "plieguePantorrilla",
] as const satisfies readonly CampoPlantilla[];

/** Para qué pacientes sirve un requisito. */
export type SexoRequisito = "AMBOS" | "MASCULINO" | "FEMENINO";

/**
 * Un resultado que la antropometría puede producir, y las medidas que exige.
 *
 * Es una TABLA, no un algoritmo, y por eso se exporta: la presentación la lee
 * para marcar en vivo, mientras se arma una plantilla, qué se sigue pudiendo
 * calcular. Comprobar si un conjunto de campos la satisface es un `every`
 * sobre un `Set`; la regla de negocio —qué exige cada resultado— vive acá.
 */
export interface RequisitoResultado {
  /** Ecuación de grasa, o el nombre del bloque cuando no lo es. */
  clave: MetodoGrasa | "CINCO_MASAS" | "SOMATOTIPO";
  etiqueta: string;
  sexo: SexoRequisito;
  campos: readonly CampoPlantilla[];
}

export const REQUISITOS_RESULTADO: readonly RequisitoResultado[] = [
  {
    clave: "YUHASZ_CARTER",
    etiqueta: DEFINICIONES_METODO.YUHASZ_CARTER.etiqueta,
    sexo: "AMBOS",
    campos: PLIEGUES_YUHASZ,
  },
  {
    clave: "YUHASZ_CARTER_KERR",
    etiqueta: DEFINICIONES_METODO.YUHASZ_CARTER_KERR.etiqueta,
    sexo: "AMBOS",
    campos: PLIEGUES_YUHASZ,
  },
  {
    clave: "FAULKNER",
    etiqueta: DEFINICIONES_METODO.FAULKNER.etiqueta,
    sexo: "AMBOS",
    campos: PLIEGUES_FAULKNER,
  },
  {
    clave: "FAULKNER_KERR",
    etiqueta: DEFINICIONES_METODO.FAULKNER_KERR.etiqueta,
    sexo: "AMBOS",
    campos: PLIEGUES_FAULKNER,
  },
  // Withers es el único que pide juegos distintos por sexo: Σ7 en varones,
  // una Σ4 propia en mujeres. Por eso figura dos veces y el alcance puede
  // terminar diciendo "solo en mujeres".
  {
    clave: "WITHERS",
    etiqueta: DEFINICIONES_METODO.WITHERS.etiqueta,
    sexo: "MASCULINO",
    campos: [...PLIEGUES_YUHASZ, "pliegueBicipital"],
  },
  {
    clave: "WITHERS",
    etiqueta: DEFINICIONES_METODO.WITHERS.etiqueta,
    sexo: "FEMENINO",
    campos: [
      "pliegueTricipital",
      "pliegueSubescapular",
      "pliegueSupraespinal",
      "plieguePantorrilla",
    ],
  },
  {
    clave: "DURNIN_WOMERSLEY",
    etiqueta: DEFINICIONES_METODO.DURNIN_WOMERSLEY.etiqueta,
    sexo: "AMBOS",
    campos: [
      "pliegueBicipital",
      "pliegueTricipital",
      "pliegueSubescapular",
      "pliegueCrestaIliaca",
    ],
  },
  // Las tres que salen del perfil ISAK: piden sitios que el ISAK no tiene
  // (pectoral, axilar medio, lumbar), así que solo las habilita una plantilla
  // que los incluya explícitamente.
  {
    clave: "JACKSON_POLLOCK_7",
    etiqueta: DEFINICIONES_METODO.JACKSON_POLLOCK_7.etiqueta,
    sexo: "AMBOS",
    campos: [
      "plieguePectoral",
      "pliegueAxilarMedio",
      "pliegueTricipital",
      "pliegueSubescapular",
      "pliegueAbdominal",
      "pliegueCrestaIliaca",
      "pliegueMuslo",
    ],
  },
  {
    clave: "JACKSON_POLLOCK_4",
    etiqueta: DEFINICIONES_METODO.JACKSON_POLLOCK_4.etiqueta,
    sexo: "AMBOS",
    campos: [
      "pliegueTricipital",
      "pliegueAbdominal",
      "pliegueCrestaIliaca",
      "pliegueMuslo",
    ],
  },
  {
    clave: "PARRILLO",
    etiqueta: DEFINICIONES_METODO.PARRILLO.etiqueta,
    sexo: "AMBOS",
    campos: [
      "plieguePectoral",
      "pliegueBicipital",
      "pliegueTricipital",
      "pliegueSubescapular",
      "pliegueAbdominal",
      "pliegueCrestaIliaca",
      "pliegueMuslo",
      "pliegueLumbar",
      "plieguePantorrilla",
    ],
  },
  {
    clave: "CINCO_MASAS",
    etiqueta: "Fraccionamiento en 5 masas (Kerr)",
    sexo: "AMBOS",
    campos: REQUERIDOS_CINCO_MASAS,
  },
  {
    clave: "SOMATOTIPO",
    etiqueta: "Somatotipo de Heath & Carter",
    sexo: "AMBOS",
    campos: [
      "tallaCm",
      "pliegueTricipital",
      "pliegueSubescapular",
      "pliegueSupraespinal",
      "plieguePantorrilla",
      "diamHumeral",
      "diamFemoral",
      "circBrazoContraido",
      "circPantorrilla",
    ],
  },
];

/** Los 4 pliegues de Faulkner: el camino más corto a un resultado. */
export const MINIMO_PARA_SERVIR = PLIEGUES_FAULKNER;

/** Una ecuación que la plantilla habilita, y para qué pacientes. */
export interface MetodoHabilitado {
  metodo: MetodoGrasa;
  /**
   * "AMBOS" si sale con cualquier paciente. Cuando dice un sexo, la plantilla
   * solo resuelve esa ecuación en pacientes de ese sexo: es el caso de Withers
   * sin el pliegue bicipital, que sale en mujeres y no en varones.
   */
  sexo: SexoRequisito;
}

/** Qué puede calcular una plantilla con los campos que incluye. */
export interface AlcancePlantilla {
  /** Ecuaciones de grasa que la plantilla resuelve. */
  metodosGrasa: MetodoHabilitado[];
  /** Si alcanza para el fraccionamiento en 5 masas. */
  cincoMasas: boolean;
  /** Si alcanza para el somatotipo de Heath & Carter. */
  somatotipo: boolean;
  /** Lo mínimo que habría que sumar para que resuelva algo; vacío si ya sirve. */
  faltaParaServir: string[];
}

/** ¿Este conjunto de campos satisface el requisito? */
export function cumpleRequisito(
  requisito: RequisitoResultado,
  incluidos: ReadonlySet<string>,
): boolean {
  return requisito.campos.every((campo) => incluidos.has(campo));
}

/**
 * Qué resultados habilita un conjunto de campos.
 * La usa la validación de la entidad; la UI trabaja sobre
 * `REQUISITOS_RESULTADO` directamente, que es la misma tabla.
 */
export function alcanceDe(campos: readonly CampoPlantilla[]): AlcancePlantilla {
  const incluidos = new Set<string>(campos);
  const cubiertos = REQUISITOS_RESULTADO.filter((requisito) =>
    cumpleRequisito(requisito, incluidos),
  );

  const metodosGrasa: MetodoHabilitado[] = [];
  for (const metodo of METODOS_GRASA) {
    const variantes = REQUISITOS_RESULTADO.filter((r) => r.clave === metodo);
    const logradas = cubiertos.filter((r) => r.clave === metodo);
    if (logradas.length === 0) continue;
    // Con todas las variantes cubiertas (o con una única "AMBOS"), la ecuación
    // sirve para cualquier paciente; con una sola, solo para ese sexo.
    const sexo =
      logradas.length === variantes.length ? "AMBOS" : logradas[0]!.sexo;
    metodosGrasa.push({ metodo, sexo });
  }

  const cincoMasas = cubiertos.some((r) => r.clave === "CINCO_MASAS");
  const somatotipo = cubiertos.some((r) => r.clave === "SOMATOTIPO");

  // Si no resuelve nada, el camino más corto es completar Faulkner: cuatro
  // pliegues y ninguna otra medida.
  const faltaParaServir =
    metodosGrasa.length === 0 && !cincoMasas
      ? MINIMO_PARA_SERVIR.filter((campo) => !incluidos.has(campo)).map(
          (campo) => ETIQUETAS_CAMPO_PLANTILLA[campo],
        )
      : [];

  return { metodosGrasa, cincoMasas, somatotipo, faltaParaServir };
}

/** Datos para crear o actualizar una plantilla. */
export interface DatosPlantillaAntropometrica {
  nombre: string;
  campos: CampoPlantilla[];
  descripcion?: string | null;
}

/** Estado completo de una plantilla persistida. */
export interface PropiedadesPlantillaAntropometrica {
  id: string;
  nombre: string;
  descripcion: string | null;
  campos: CampoPlantilla[];
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Entidad de dominio PlantillaAntropometrica.
 *
 * El peso NO figura entre los campos: es obligatorio en toda medición y no se
 * puede quitar, así que incluirlo en la lista sería ofrecer una casilla que
 * nunca se puede destildar.
 */
export class PlantillaAntropometrica {
  private constructor(
    private readonly props: PropiedadesPlantillaAntropometrica,
  ) {}

  static crear(
    datos: DatosPlantillaAntropometrica,
    id: string,
    ahora: Date = new Date(),
  ): PlantillaAntropometrica {
    const nombre = datos.nombre?.trim() ?? "";
    if (nombre.length === 0) {
      throw new ErrorValidacion("La plantilla necesita un nombre.");
    }
    if (nombre.length > 80) {
      throw new ErrorValidacion(
        "El nombre de la plantilla no puede superar los 80 caracteres.",
      );
    }

    const campos = normalizarCampos(datos.campos);
    validarQueSirva(campos);

    return new PlantillaAntropometrica({
      id,
      nombre,
      descripcion: datos.descripcion?.trim() || null,
      campos,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(
    props: PropiedadesPlantillaAntropometrica,
  ): PlantillaAntropometrica {
    return new PlantillaAntropometrica(props);
  }

  actualizar(
    cambios: Partial<DatosPlantillaAntropometrica>,
    ahora: Date = new Date(),
  ): PlantillaAntropometrica {
    const validada = PlantillaAntropometrica.crear(
      {
        nombre: cambios.nombre ?? this.props.nombre,
        campos: cambios.campos ?? this.props.campos,
        descripcion:
          cambios.descripcion !== undefined
            ? cambios.descripcion
            : this.props.descripcion,
      },
      this.props.id,
      ahora,
    );
    return PlantillaAntropometrica.reconstruir({
      ...validada.aPrimitivos(),
      creadoEn: this.props.creadoEn,
    });
  }

  /** Qué resultados habilita esta plantilla. */
  alcance(): AlcancePlantilla {
    return alcanceDe(this.props.campos);
  }

  get id(): string {
    return this.props.id;
  }
  get nombre(): string {
    return this.props.nombre;
  }
  get campos(): CampoPlantilla[] {
    return [...this.props.campos];
  }

  aPrimitivos(): PropiedadesPlantillaAntropometrica {
    return { ...this.props, campos: [...this.props.campos] };
  }
}

/** Descarta desconocidos y duplicados, y respeta el orden canónico ISAK. */
function normalizarCampos(campos: readonly string[]): CampoPlantilla[] {
  const pedidos = new Set(campos);
  return CAMPOS_PLANTILLA.filter((campo) => pedidos.has(campo));
}

/**
 * Una plantilla que no resuelve NADA genera mediciones sin resultados.
 * El mensaje dice qué falta para el camino más corto (Faulkner), en vez de
 * un "elegí más campos" que obliga a adivinar.
 */
function validarQueSirva(campos: readonly CampoPlantilla[]): void {
  const { metodosGrasa, cincoMasas, faltaParaServir } = alcanceDe(campos);
  if (metodosGrasa.length > 0 || cincoMasas) return;

  throw new ErrorValidacion(
    `Con estos campos no se puede calcular ningún resultado. Lo mínimo es ` +
      `${DEFINICIONES_METODO.FAULKNER.etiqueta}: falta ` +
      `${faltaParaServir.join(", ").toLowerCase()}.`,
  );
}
