import { ErrorValidacion } from "../errores/ErrorValidacion";

/**
 * Variables que el recordatorio sabe reemplazar. Son las MISMAS que usan las
 * plantillas de email para que el profesional no aprenda dos vocabularios.
 */
export const VARIABLES_RECORDATORIO = ["paciente", "fecha", "hora", "profesional"] as const;
export type VariableRecordatorio = (typeof VARIABLES_RECORDATORIO)[number];

export const MAX_LARGO_CUERPO_PLANTILLA = 1000;

/**
 * Texto con el que arranca todo consultorio. Usa los mismos placeholders que
 * las plantillas de email para que el profesional no aprenda dos vocabularios.
 */
export const CUERPO_RECORDATORIO_POR_DEFECTO =
  "¡Hola {{paciente}}! Te recuerdo tu turno del {{fecha}} a las {{hora}}. " +
  "Si necesitás reprogramarlo, avisame por acá. ¡Nos vemos! {{profesional}}";

/** Nombre de la plantilla que se siembra al dar de alta un consultorio. */
export const NOMBRE_PLANTILLA_POR_DEFECTO = "Recordatorio de turno";
/** Meta admite hasta 10 parámetros posicionales en el cuerpo de una plantilla. */
export const MAX_VARIABLES_META = 10;

/** Campos editables de una plantilla de recordatorio por WhatsApp. */
export interface DatosPlantillaWhatsapp {
  nombre: string;
  cuerpo: string;
  /** Nombre de la plantilla aprobada en Meta; null = solo vista previa/wa.me. */
  claveMeta: string | null;
  idiomaMeta: string;
  /** Placeholders en el ORDEN de los {{1}}, {{2}}… del cuerpo aprobado. */
  variablesMeta: VariableRecordatorio[];
  predeterminada: boolean;
  activa: boolean;
}

/** Estado completo persistido. */
export interface PropiedadesPlantillaWhatsapp extends DatosPlantillaWhatsapp {
  id: string;
  creadoEn: Date;
  actualizadoEn: Date;
}

/**
 * Entidad de dominio PlantillaWhatsapp: el texto con el que sale el
 * recordatorio de turno.
 *
 * Tiene dos caras porque el canal tiene dos modos y no se puede servir a uno
 * solo:
 *
 *   * `cuerpo` — el texto en castellano con {{placeholders}}. Es lo que ve el
 *     profesional en la vista previa y lo que viaja por el enlace wa.me.
 *   * `claveMeta` + `variablesMeta` — la plantilla APROBADA en Meta. Fuera de
 *     la ventana de 24 h desde el último mensaje del paciente, la Cloud API
 *     rechaza el texto libre, y un recordatorio de turno casi siempre cae
 *     fuera de esa ventana: sin plantilla aprobada no hay envío automático.
 *     Meta identifica los parámetros POR POSICIÓN ({{1}}, {{2}}…), no por
 *     nombre, así que el orden de `variablesMeta` es parte del contrato.
 *
 * Una plantilla sin `claveMeta` es válida y útil (el modo enlace no la
 * necesita); lo que no puede es salir sola por la API. La UI lo dice antes de
 * que el envío falle, en vez de dejar que Meta lo rechace en silencio.
 */
export class PlantillaWhatsapp {
  private constructor(private readonly props: PropiedadesPlantillaWhatsapp) {}

  static crear(
    datos: DatosPlantillaWhatsapp,
    id: string,
    ahora: Date = new Date(),
  ): PlantillaWhatsapp {
    const normalizados = normalizar(datos);
    validar(normalizados);
    return new PlantillaWhatsapp({ ...normalizados, id, creadoEn: ahora, actualizadoEn: ahora });
  }

  static reconstruir(props: PropiedadesPlantillaWhatsapp): PlantillaWhatsapp {
    return new PlantillaWhatsapp(props);
  }

  /** Copia con los cambios aplicados y validados (id/creadoEn intactos). */
  actualizar(
    cambios: Partial<DatosPlantillaWhatsapp>,
    ahora: Date = new Date(),
  ): PlantillaWhatsapp {
    const datos = normalizar({
      nombre: cambios.nombre ?? this.props.nombre,
      cuerpo: cambios.cuerpo ?? this.props.cuerpo,
      claveMeta: cambios.claveMeta !== undefined ? cambios.claveMeta : this.props.claveMeta,
      idiomaMeta: cambios.idiomaMeta ?? this.props.idiomaMeta,
      variablesMeta: cambios.variablesMeta ?? this.props.variablesMeta,
      predeterminada: cambios.predeterminada ?? this.props.predeterminada,
      activa: cambios.activa ?? this.props.activa,
    });
    validar(datos);
    return new PlantillaWhatsapp({ ...this.props, ...datos, actualizadoEn: ahora });
  }

  /** Deja de ser la predeterminada (al marcar otra en su lugar). */
  desmarcarPredeterminada(ahora: Date = new Date()): PlantillaWhatsapp {
    if (!this.props.predeterminada) return this;
    return new PlantillaWhatsapp({
      ...this.props,
      predeterminada: false,
      actualizadoEn: ahora,
    });
  }

  /**
   * Puede salir por la Cloud API fuera de la ventana de 24 h. Sin clave de
   * Meta el envío existe igual, pero solo como enlace que abre el profesional.
   */
  get admiteEnvioPorApi(): boolean {
    return this.props.claveMeta != null;
  }

  get id(): string {
    return this.props.id;
  }
  get nombre(): string {
    return this.props.nombre;
  }
  get cuerpo(): string {
    return this.props.cuerpo;
  }
  get claveMeta(): string | null {
    return this.props.claveMeta;
  }
  get idiomaMeta(): string {
    return this.props.idiomaMeta;
  }
  get variablesMeta(): VariableRecordatorio[] {
    return [...this.props.variablesMeta];
  }
  get activa(): boolean {
    return this.props.activa;
  }
  get predeterminada(): boolean {
    return this.props.predeterminada;
  }

  aPrimitivos(): PropiedadesPlantillaWhatsapp {
    return { ...this.props, variablesMeta: [...this.props.variablesMeta] };
  }
}

function normalizar(datos: DatosPlantillaWhatsapp): DatosPlantillaWhatsapp {
  return {
    ...datos,
    nombre: datos.nombre?.trim() ?? "",
    cuerpo: datos.cuerpo?.trim() ?? "",
    claveMeta: datos.claveMeta?.trim() || null,
    idiomaMeta: datos.idiomaMeta?.trim() || "es_AR",
    variablesMeta: [...(datos.variablesMeta ?? [])],
  };
}

function validar(d: DatosPlantillaWhatsapp): void {
  if (d.nombre.length === 0) {
    throw new ErrorValidacion("La plantilla necesita un nombre.");
  }
  if (d.nombre.length > 80) {
    throw new ErrorValidacion("El nombre de la plantilla no puede superar los 80 caracteres.");
  }
  if (d.cuerpo.length === 0) {
    throw new ErrorValidacion("La plantilla no puede tener un cuerpo vacío.");
  }
  if (d.cuerpo.length > MAX_LARGO_CUERPO_PLANTILLA) {
    throw new ErrorValidacion(
      `El cuerpo de la plantilla no puede superar los ${MAX_LARGO_CUERPO_PLANTILLA} caracteres.`,
    );
  }
  // Meta acepta el nombre en minúsculas, dígitos y guión bajo. Rechazarlo acá
  // ahorra un envío que la API contestaría con un error opaco.
  if (d.claveMeta != null && !/^[a-z0-9_]{1,512}$/.test(d.claveMeta)) {
    throw new ErrorValidacion(
      "El nombre de la plantilla en Meta solo admite minúsculas, números y guión bajo.",
    );
  }
  if (d.variablesMeta.length > MAX_VARIABLES_META) {
    throw new ErrorValidacion(
      `Una plantilla de Meta admite hasta ${MAX_VARIABLES_META} parámetros.`,
    );
  }
  for (const variable of d.variablesMeta) {
    if (!VARIABLES_RECORDATORIO.includes(variable)) {
      throw new ErrorValidacion(`«${variable}» no es una variable del recordatorio.`);
    }
  }
  if (d.claveMeta != null && d.variablesMeta.length === 0 && /{{\s*\w+\s*}}/.test(d.cuerpo)) {
    throw new ErrorValidacion(
      "El cuerpo tiene variables pero no se indicó el orden de los parámetros de Meta.",
    );
  }
}
