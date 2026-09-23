import { ErrorValidacion } from "../errores/ErrorValidacion";

/**
 * Variables que el recordatorio sabe reemplazar. Son las MISMAS que usan las
 * plantillas de email para que el profesional no aprenda dos vocabularios.
 */
export const VARIABLES_RECORDATORIO = [
  // `establecimiento` y `direccion` llegaron con las sedes múltiples: con un
  // solo consultorio el paciente sabía dónde, con dos hay que decírselo. Son
  // opcionales en la plantilla como todas las demás; las viejas siguen
  // funcionando sin tocarlas.
  "establecimiento",
  "direccion",
  "paciente",
  "fecha",
  "hora",
  "profesional",
] as const;
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

/** Anticipación máxima admitida para `diasAntes`, en días (ver ConfiguracionRecordatorios). */
export const MAX_DIAS_ANTES_PLANTILLA = 60;

/**
 * Categoría con la que se da de alta en Meta. Un recordatorio de turno es
 * UTILITY (aviso transaccional); MARKETING se cobra distinto y Meta la exige
 * para todo lo promocional. Meta puede recategorizarla al revisarla.
 */
export const CATEGORIAS_META = ["UTILITY", "MARKETING"] as const;
export type CategoriaMeta = (typeof CATEGORIAS_META)[number];

/**
 * Estado de la revisión en Meta, ya traducido. Meta tiene más estados
 * (FLAGGED, IN_APPEAL, PENDING_DELETION…); se pliegan a estos cinco porque es
 * lo único que el profesional necesita saber: ¿sale o no sale, y por qué?
 *
 * Como `MetodoGrasa`, los valores solo se agregan.
 */
export const ESTADOS_PLANTILLA_META = [
  "EN_REVISION",
  "APROBADA",
  "RECHAZADA",
  "PAUSADA",
  "DESHABILITADA",
] as const;
export type EstadoPlantillaMeta = (typeof ESTADOS_PLANTILLA_META)[number];

/**
 * Qué hace la app cuando el paciente toca una respuesta rápida. La acción
 * viaja en el `payload` del botón junto con el turno (ver
 * `dominio/servicios/botonesWhatsapp`), así que no depende del texto: el
 * profesional puede escribir «Confirmo» o «Ahí estaré» y el efecto es el mismo.
 */
export const ACCIONES_RESPUESTA_RAPIDA = [
  "CONFIRMAR_TURNO",
  "PEDIR_REPROGRAMACION",
  "NINGUNA",
] as const;
export type AccionRespuestaRapida = (typeof ACCIONES_RESPUESTA_RAPIDA)[number];

/**
 * A dónde lleva un botón de enlace. CONFIRMACION_TURNO es el mismo enlace
 * firmado del recordatorio por email; en Meta queda registrado como URL
 * dinámica (`…?token={{1}}`) y el token se completa en cada envío.
 */
export const DESTINOS_BOTON_URL = ["CONFIRMACION_TURNO", "FIJA"] as const;
export type DestinoBotonUrl = (typeof DESTINOS_BOTON_URL)[number];

export type BotonPlantilla =
  | { tipo: "RESPUESTA_RAPIDA"; texto: string; accion: AccionRespuestaRapida }
  | {
      tipo: "URL";
      texto: string;
      destino: DestinoBotonUrl;
      /** Solo para destino FIJA; null en CONFIRMACION_TURNO. */
      url: string | null;
    };

/** Límites de Meta para los botones de una plantilla. */
export const MAX_BOTONES_PLANTILLA = 10;
export const MAX_BOTONES_URL = 2;
export const MAX_LARGO_TEXTO_BOTON = 25;

/** Variables que solo se pueden completar si hay un turno de por medio. */
const VARIABLES_DEL_TURNO: readonly string[] = [
  "fecha",
  "hora",
  "establecimiento",
  "direccion",
];

const PATRON_VARIABLE = /{{\s*(\w+)\s*}}/g;

/** Campos editables de una plantilla de recordatorio por WhatsApp. */
export interface DatosPlantillaWhatsapp {
  nombre: string;
  cuerpo: string;
  /** Nombre de la plantilla aprobada en Meta; null = solo vista previa/wa.me. */
  claveMeta: string | null;
  idiomaMeta: string;
  /** Placeholders en el ORDEN de los {{1}}, {{2}}… del cuerpo aprobado. */
  variablesMeta: VariableRecordatorio[];
  /**
   * Escalón de "días antes" al que corresponde este texto (3, 1, …). null =
   * sin día asignado: candidata a predeterminada, pero no el texto fijo de
   * ningún escalón. Asignarla a un día libera ese día de cualquier otra
   * plantilla que lo tuviera: cada escalón tiene UN texto.
   */
  diasAntes: number | null;
  predeterminada: boolean;
  activa: boolean;
  /** Por defecto UTILITY. */
  categoriaMeta?: CategoriaMeta;
  /**
   * Botones de la plantilla de Meta. Las respuestas rápidas quedan siempre
   * antes que los enlaces: Meta exige que los botones de un mismo tipo estén
   * juntos, y la posición es lo que identifica a cada uno al enviar.
   */
  botones?: BotonPlantilla[];
}

/** Estado completo persistido. */
export interface PropiedadesPlantillaWhatsapp extends Omit<
  DatosPlantillaWhatsapp,
  "categoriaMeta" | "botones"
> {
  id: string;
  categoriaMeta: CategoriaMeta;
  botones: BotonPlantilla[];
  /**
   * Id de la plantilla en Meta. Solo lo tienen las que se dieron de alta DESDE
   * la app: es lo que dice que la app la administra (la edita y la borra en
   * Meta). Una vinculada a mano por su nombre lo deja en null.
   */
  idMeta: string | null;
  /** null = nunca se consultó (vinculada a mano, o sin clave de Meta). */
  estadoMeta: EstadoPlantillaMeta | null;
  /** Lo que dijo Meta al rechazarla o pausarla. */
  motivoEstadoMeta: string | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

/** Datos ya normalizados: categoría y botones siempre presentes. */
type DatosNormalizados = DatosPlantillaWhatsapp & {
  categoriaMeta: CategoriaMeta;
  botones: BotonPlantilla[];
};

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
 *
 * La plantilla de Meta se puede dar de alta de dos maneras: DESDE la app
 * (`idMeta` presente: la app la manda a revisión, la edita y sigue su estado)
 * o creándola a mano en Meta y anotando acá su nombre (`idMeta` null: la app
 * solo la usa). Ver `docs/WHATSAPP.md`.
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
    return new PlantillaWhatsapp({
      ...normalizados,
      id,
      idMeta: null,
      estadoMeta: null,
      motivoEstadoMeta: null,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
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
      claveMeta:
        cambios.claveMeta !== undefined
          ? cambios.claveMeta
          : this.props.claveMeta,
      idiomaMeta: cambios.idiomaMeta ?? this.props.idiomaMeta,
      variablesMeta: cambios.variablesMeta ?? this.props.variablesMeta,
      diasAntes:
        cambios.diasAntes !== undefined
          ? cambios.diasAntes
          : this.props.diasAntes,
      predeterminada: cambios.predeterminada ?? this.props.predeterminada,
      activa: cambios.activa ?? this.props.activa,
      categoriaMeta: cambios.categoriaMeta ?? this.props.categoriaMeta,
      botones: cambios.botones ?? this.props.botones,
    });
    validar(datos);
    // Meta no deja renombrar una plantilla ni cambiarle el idioma: son su
    // identidad. Cambiarlos acá dejaría a la app mandando un nombre que Meta
    // no conoce.
    if (
      this.props.idMeta != null &&
      (datos.claveMeta !== this.props.claveMeta ||
        datos.idiomaMeta !== this.props.idiomaMeta)
    ) {
      throw new ErrorValidacion(
        "El nombre en Meta y el idioma de una plantilla ya enviada a Meta no se pueden cambiar. Creá una nueva.",
      );
    }
    return new PlantillaWhatsapp({
      ...this.props,
      ...datos,
      actualizadoEn: ahora,
    });
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

  /** Libera su día (al asignárselo a otra plantilla). */
  liberarDia(ahora: Date = new Date()): PlantillaWhatsapp {
    if (this.props.diasAntes == null) return this;
    return new PlantillaWhatsapp({
      ...this.props,
      diasAntes: null,
      actualizadoEn: ahora,
    });
  }

  /**
   * Quedó dada de alta en Meta desde la app: se envió a revisión y Meta le
   * asignó un id. Desde acá la app la edita y la borra allá.
   */
  registrarAltaEnMeta(
    idMeta: string,
    estado: EstadoPlantillaMeta,
    ahora: Date = new Date(),
  ): PlantillaWhatsapp {
    return new PlantillaWhatsapp({
      ...this.props,
      // Las variables salen del cuerpo en el orden en que aparecen: es
      // exactamente como quedaron numeradas en lo que se mandó a Meta.
      variablesMeta: this.formatoMeta().variables,
      idMeta,
      estadoMeta: estado,
      motivoEstadoMeta: null,
      actualizadoEn: ahora,
    });
  }

  /** Se editó en Meta: vuelve a revisión con el contenido nuevo. */
  registrarEdicionEnMeta(ahora: Date = new Date()): PlantillaWhatsapp {
    return new PlantillaWhatsapp({
      ...this.props,
      variablesMeta: this.formatoMeta().variables,
      estadoMeta: "EN_REVISION",
      motivoEstadoMeta: null,
      actualizadoEn: ahora,
    });
  }

  /**
   * El estado que informó Meta (webhook o consulta). Devuelve la misma
   * instancia si nada cambió, para no escribir de más.
   */
  registrarEstadoMeta(
    estado: EstadoPlantillaMeta,
    motivo: string | null,
    ahora: Date = new Date(),
  ): PlantillaWhatsapp {
    const motivoLimpio = motivo?.trim() || null;
    if (
      estado === this.props.estadoMeta &&
      motivoLimpio === this.props.motivoEstadoMeta
    ) {
      return this;
    }
    return new PlantillaWhatsapp({
      ...this.props,
      estadoMeta: estado,
      motivoEstadoMeta: motivoLimpio,
      actualizadoEn: ahora,
    });
  }

  /**
   * Lo que se le manda a Meta cambió respecto de `anterior`: cuerpo, botones
   * o categoría. Es lo que decide si una edición vuelve a pasar por revisión.
   */
  contenidoMetaDistintoDe(anterior: PlantillaWhatsapp): boolean {
    return (
      this.props.cuerpo !== anterior.props.cuerpo ||
      this.props.categoriaMeta !== anterior.props.categoriaMeta ||
      JSON.stringify(this.props.botones) !==
        JSON.stringify(anterior.props.botones)
    );
  }

  /**
   * El cuerpo como lo numera Meta: cada `{{variable}}` pasa a `{{1}}`,
   * `{{2}}`… en orden de aparición, y `variables` dice con qué se completa
   * cada posición.
   */
  formatoMeta(): { texto: string; variables: VariableRecordatorio[] } {
    const variables: VariableRecordatorio[] = [];
    const texto = this.props.cuerpo.replace(
      PATRON_VARIABLE,
      (_coincidencia, nombre: string) => {
        variables.push(nombre as VariableRecordatorio);
        return `{{${variables.length}}}`;
      },
    );
    return { texto, variables };
  }

  /**
   * Lo que Meta rechazaría al darla de alta, dicho en castellano antes de
   * llamar a la API: su error llega en inglés y sin decir qué hacer.
   */
  validarParaMeta(): void {
    if (this.props.claveMeta == null) {
      throw new ErrorValidacion(
        "Para enviarla a Meta, la plantilla necesita un nombre en Meta.",
      );
    }
    const nombres = nombresDeVariables(this.props.cuerpo);
    const desconocida = nombres.find(
      (n) => !(VARIABLES_RECORDATORIO as readonly string[]).includes(n),
    );
    if (desconocida) {
      throw new ErrorValidacion(
        `«{{${desconocida}}}» no es un dato que la app sepa completar.`,
      );
    }
    if (nombres.length > MAX_VARIABLES_META) {
      throw new ErrorValidacion(
        `Una plantilla de Meta admite hasta ${MAX_VARIABLES_META} datos variables.`,
      );
    }
    // Regla de Meta: el cuerpo no puede empezar ni terminar con una variable.
    if (
      /^{{[^}]+}}/.test(this.props.cuerpo) ||
      /{{[^}]+}}$/.test(this.props.cuerpo)
    ) {
      throw new ErrorValidacion(
        "Meta no acepta un mensaje que empiece o termine con un dato variable. Agregale texto antes o después (aunque sea un punto).",
      );
    }
  }

  /**
   * Necesita un turno para armarse: usa la fecha, la hora o la sede, o tiene
   * un botón que actúa sobre el turno. Desde el chat solo se puede mandar si
   * el paciente tiene un turno próximo.
   */
  get necesitaTurno(): boolean {
    return (
      nombresDeVariables(this.props.cuerpo).some((n) =>
        VARIABLES_DEL_TURNO.includes(n),
      ) ||
      this.props.botones.some((b) =>
        b.tipo === "URL"
          ? b.destino === "CONFIRMACION_TURNO"
          : b.accion !== "NINGUNA",
      )
    );
  }

  /**
   * Puede salir por la Cloud API fuera de la ventana de 24 h. Sin clave de
   * Meta el envío existe igual, pero solo como enlace que abre el profesional.
   *
   * Con estado conocido, además tiene que estar APROBADA: una en revisión o
   * rechazada la rebota Meta. Con estado desconocido (vinculada a mano y
   * nunca consultada) se asume aprobada, que es lo que declaró quien la cargó.
   */
  get admiteEnvioPorApi(): boolean {
    return (
      this.props.claveMeta != null &&
      (this.props.estadoMeta == null || this.props.estadoMeta === "APROBADA")
    );
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
  get diasAntes(): number | null {
    return this.props.diasAntes;
  }
  get activa(): boolean {
    return this.props.activa;
  }
  get predeterminada(): boolean {
    return this.props.predeterminada;
  }
  get categoriaMeta(): CategoriaMeta {
    return this.props.categoriaMeta;
  }
  get botones(): BotonPlantilla[] {
    return this.props.botones.map((b) => ({ ...b }));
  }
  get idMeta(): string | null {
    return this.props.idMeta;
  }
  get estadoMeta(): EstadoPlantillaMeta | null {
    return this.props.estadoMeta;
  }
  get motivoEstadoMeta(): string | null {
    return this.props.motivoEstadoMeta;
  }
  /** La dio de alta la app en Meta (y por eso la administra). */
  get enviadaAMeta(): boolean {
    return this.props.idMeta != null;
  }

  aPrimitivos(): PropiedadesPlantillaWhatsapp {
    return {
      ...this.props,
      variablesMeta: [...this.props.variablesMeta],
      botones: this.botones,
    };
  }
}

function nombresDeVariables(cuerpo: string): string[] {
  return [...cuerpo.matchAll(PATRON_VARIABLE)].map((m) => m[1] ?? "");
}

/**
 * Las variables del cuerpo en orden de aparición: el `variablesMeta` de una
 * plantilla que da de alta la app, que numera así lo que manda a Meta.
 */
export function variablesDelCuerpo(cuerpo: string): VariableRecordatorio[] {
  return nombresDeVariables(cuerpo.trim()).filter(
    (n): n is VariableRecordatorio =>
      (VARIABLES_RECORDATORIO as readonly string[]).includes(n),
  );
}

function normalizar(datos: DatosPlantillaWhatsapp): DatosNormalizados {
  const botones = (datos.botones ?? []).map(normalizarBoton);
  return {
    ...datos,
    nombre: datos.nombre?.trim() ?? "",
    cuerpo: datos.cuerpo?.trim() ?? "",
    claveMeta: datos.claveMeta?.trim() || null,
    idiomaMeta: datos.idiomaMeta?.trim() || "es_AR",
    variablesMeta: [...(datos.variablesMeta ?? [])],
    categoriaMeta: datos.categoriaMeta ?? "UTILITY",
    // Respuestas rápidas primero, enlaces después, respetando el orden dentro
    // de cada grupo. Meta rechaza los grupos intercalados, y el índice de cada
    // botón al enviar es su posición en esta lista.
    botones: [
      ...botones.filter((b) => b.tipo === "RESPUESTA_RAPIDA"),
      ...botones.filter((b) => b.tipo === "URL"),
    ],
  };
}

function normalizarBoton(boton: BotonPlantilla): BotonPlantilla {
  const texto = boton.texto?.trim() ?? "";
  if (boton.tipo === "RESPUESTA_RAPIDA") {
    return { tipo: "RESPUESTA_RAPIDA", texto, accion: boton.accion };
  }
  return {
    tipo: "URL",
    texto,
    destino: boton.destino,
    url: boton.destino === "FIJA" ? boton.url?.trim() || null : null,
  };
}

function validarBotones(botones: BotonPlantilla[]): void {
  if (botones.length > MAX_BOTONES_PLANTILLA) {
    throw new ErrorValidacion(
      `Una plantilla admite hasta ${MAX_BOTONES_PLANTILLA} botones.`,
    );
  }
  if (botones.filter((b) => b.tipo === "URL").length > MAX_BOTONES_URL) {
    throw new ErrorValidacion(
      `Una plantilla admite hasta ${MAX_BOTONES_URL} botones de enlace.`,
    );
  }
  const textos = new Set<string>();
  for (const boton of botones) {
    if (boton.texto.length === 0) {
      throw new ErrorValidacion("Todos los botones necesitan un texto.");
    }
    if (boton.texto.length > MAX_LARGO_TEXTO_BOTON) {
      throw new ErrorValidacion(
        `El texto de un botón no puede superar los ${MAX_LARGO_TEXTO_BOTON} caracteres («${boton.texto}»).`,
      );
    }
    const clave = boton.texto.toLowerCase();
    if (textos.has(clave)) {
      throw new ErrorValidacion(
        `Hay dos botones con el mismo texto («${boton.texto}»).`,
      );
    }
    textos.add(clave);
    if (
      boton.tipo === "URL" &&
      boton.destino === "FIJA" &&
      !/^https:\/\/\S+$/.test(boton.url ?? "")
    ) {
      throw new ErrorValidacion(
        `El botón «${boton.texto}» necesita un enlace que empiece con https://.`,
      );
    }
  }
  for (const accion of ["CONFIRMAR_TURNO", "PEDIR_REPROGRAMACION"] as const) {
    const conEsaAccion = botones.filter(
      (b) => b.tipo === "RESPUESTA_RAPIDA" && b.accion === accion,
    );
    if (conEsaAccion.length > 1) {
      throw new ErrorValidacion(
        "Cada acción sobre el turno puede estar en un solo botón.",
      );
    }
  }
}

function validar(d: DatosNormalizados): void {
  validarBotones(d.botones);
  if (d.nombre.length === 0) {
    throw new ErrorValidacion("La plantilla necesita un nombre.");
  }
  if (d.nombre.length > 80) {
    throw new ErrorValidacion(
      "El nombre de la plantilla no puede superar los 80 caracteres.",
    );
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
  if (
    d.diasAntes != null &&
    (!Number.isInteger(d.diasAntes) ||
      d.diasAntes < 0 ||
      d.diasAntes > MAX_DIAS_ANTES_PLANTILLA)
  ) {
    throw new ErrorValidacion(
      `El día asignado debe ser un entero de 0 a ${MAX_DIAS_ANTES_PLANTILLA}.`,
    );
  }
  if (d.variablesMeta.length > MAX_VARIABLES_META) {
    throw new ErrorValidacion(
      `Una plantilla de Meta admite hasta ${MAX_VARIABLES_META} parámetros.`,
    );
  }
  for (const variable of d.variablesMeta) {
    if (!VARIABLES_RECORDATORIO.includes(variable)) {
      throw new ErrorValidacion(
        `«${variable}» no es una variable del recordatorio.`,
      );
    }
  }
  if (
    d.claveMeta != null &&
    d.variablesMeta.length === 0 &&
    /{{\s*\w+\s*}}/.test(d.cuerpo)
  ) {
    throw new ErrorValidacion(
      "El cuerpo tiene variables pero no se indicó el orden de los parámetros de Meta.",
    );
  }
}
