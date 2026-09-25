import { ErrorValidacion } from "../errores/ErrorValidacion";
import { MAX_LARGO_MENSAJE_CANCELACION } from "../servicios/cancelacionPorWhatsapp";
import {
  renderizarPlantilla,
  renderizarPlantillaHtml,
} from "../plantillas/renderizar";

/** Anticipación máxima admitida para `diasAntes` (ver ConfiguracionRecordatorios). */
export const MAX_DIAS_ANTES_PLANTILLA_EMAIL = 60;

/**
 * Qué botón de cancelar lleva el email.
 *
 * - NINGUNO: no ofrece cancelar (el default: no todo aviso tiene por qué).
 * - APP: enlace firmado a /cancelar-turno. El turno se cancela sin que nadie
 *   intervenga, y queda registrado cuándo y que fue el paciente.
 * - WHATSAPP: abre el chat con el número de cancelaciones del consultorio con
 *   `mensajeCancelacion` ya escrito. No toca el turno: lo cancela el
 *   profesional al leer el mensaje.
 *
 * Como `MetodoGrasa`, los valores solo se agregan: también es un enum de la
 * base.
 */
export const BOTONES_CANCELACION = ["NINGUNO", "APP", "WHATSAPP"] as const;
export type BotonCancelacion = (typeof BOTONES_CANCELACION)[number];

/** Texto con el que arranca todo consultorio nuevo. */
export const ASUNTO_RECORDATORIO_POR_DEFECTO =
  "Recordatorio de tu turno del {{fecha}}";
export const CUERPO_RECORDATORIO_EMAIL_POR_DEFECTO = `<div style="font-family:sans-serif;color:#222;line-height:1.5">
  <p>Hola <strong>{{paciente}}</strong>,</p>
  <p>Te recordamos tu turno para el <strong>{{fecha}}</strong> a las <strong>{{hora}}</strong>.</p>
  <p>Si no podés asistir, avisanos con anticipación para reprogramarlo.</p>
  <p>Saludos,<br/>{{profesional}}</p>
</div>`;

/** Campos editables de una plantilla de recordatorio por email. */
export interface DatosPlantillaEmailRecordatorio {
  nombre: string;
  asunto: string;
  cuerpoHtml: string;
  /**
   * Escalón de "días antes" al que corresponde este texto (3, 1, …). null =
   * sin día asignado: candidata a predeterminada, pero no el texto fijo de
   * ningún escalón. Asignarla a un día libera ese día de cualquier otra
   * plantilla que lo tuviera: cada escalón tiene UN texto.
   */
  diasAntes: number | null;
  predeterminada: boolean;
  activa: boolean;
  /**
   * Si este mensaje suma el botón "Confirmar asistencia" (solo se agrega a
   * turnos PENDIENTE). Antes salía siempre; es una decisión por plantilla
   * porque no todo mensaje de recordatorio tiene sentido que lo pida.
   */
  incluirBotonConfirmacion: boolean;
  /**
   * Botón de cancelar. Es por plantilla, igual que el de confirmar. Opcional
   * al dar de alta: por defecto NINGUNO.
   */
  botonCancelacion?: BotonCancelacion;
  /**
   * Solo con `botonCancelacion` WHATSAPP: el texto que queda escrito en el
   * chat, con las variables del recordatorio. null = el texto por defecto.
   * Se conserva aunque se cambie de modo, para no perderlo al ir y volver.
   */
  mensajeCancelacion?: string | null;
}

/** Datos ya normalizados: el botón de cancelar siempre presente. */
type DatosNormalizados = DatosPlantillaEmailRecordatorio & {
  botonCancelacion: BotonCancelacion;
  mensajeCancelacion: string | null;
};

/** Estado completo persistido. */
export interface PropiedadesPlantillaEmailRecordatorio extends DatosNormalizados {
  id: string;
  creadoEn: Date;
  actualizadoEn: Date;
}

/** Resultado de renderizar una plantilla con sus variables reemplazadas. */
export interface EmailRecordatorioRenderizado {
  asunto: string;
  html: string;
}

/**
 * Entidad de dominio PlantillaEmailRecordatorio: el texto con el que sale el
 * recordatorio de turno por email.
 *
 * Espejo de `PlantillaWhatsapp`, que ya resolvía lo mismo para WhatsApp: antes
 * había UN solo texto de email para todos los escalones de anticipación, así
 * que "3 días antes" y "1 día antes" decían exactamente lo mismo aunque el
 * profesional quisiera avisos distintos ("todavía estás a tiempo de
 * reprogramar" vs. "es mañana").
 */
export class PlantillaEmailRecordatorio {
  private constructor(
    private readonly props: PropiedadesPlantillaEmailRecordatorio,
  ) {}

  static crear(
    datos: DatosPlantillaEmailRecordatorio,
    id: string,
    ahora: Date = new Date(),
  ): PlantillaEmailRecordatorio {
    const normalizados = normalizar(datos);
    validar(normalizados);
    return new PlantillaEmailRecordatorio({
      ...normalizados,
      id,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(
    props: PropiedadesPlantillaEmailRecordatorio,
  ): PlantillaEmailRecordatorio {
    return new PlantillaEmailRecordatorio(props);
  }

  /** Copia con los cambios aplicados y validados (id/creadoEn intactos). */
  actualizar(
    cambios: Partial<DatosPlantillaEmailRecordatorio>,
    ahora: Date = new Date(),
  ): PlantillaEmailRecordatorio {
    const datos = normalizar({
      nombre: cambios.nombre ?? this.props.nombre,
      asunto: cambios.asunto ?? this.props.asunto,
      cuerpoHtml: cambios.cuerpoHtml ?? this.props.cuerpoHtml,
      diasAntes:
        cambios.diasAntes !== undefined
          ? cambios.diasAntes
          : this.props.diasAntes,
      predeterminada: cambios.predeterminada ?? this.props.predeterminada,
      activa: cambios.activa ?? this.props.activa,
      incluirBotonConfirmacion:
        cambios.incluirBotonConfirmacion ?? this.props.incluirBotonConfirmacion,
      botonCancelacion: cambios.botonCancelacion ?? this.props.botonCancelacion,
      mensajeCancelacion:
        cambios.mensajeCancelacion !== undefined
          ? cambios.mensajeCancelacion
          : this.props.mensajeCancelacion,
    });
    validar(datos);
    return new PlantillaEmailRecordatorio({
      ...this.props,
      ...datos,
      actualizadoEn: ahora,
    });
  }

  /** Deja de ser la predeterminada (al marcar otra en su lugar). */
  desmarcarPredeterminada(
    ahora: Date = new Date(),
  ): PlantillaEmailRecordatorio {
    if (!this.props.predeterminada) return this;
    return new PlantillaEmailRecordatorio({
      ...this.props,
      predeterminada: false,
      actualizadoEn: ahora,
    });
  }

  /** Libera su día (al asignárselo a otra plantilla). */
  liberarDia(ahora: Date = new Date()): PlantillaEmailRecordatorio {
    if (this.props.diasAntes == null) return this;
    return new PlantillaEmailRecordatorio({
      ...this.props,
      diasAntes: null,
      actualizadoEn: ahora,
    });
  }

  /**
   * Reemplaza los placeholders {{clave}} por los valores provistos. El asunto
   * es texto plano y va sin escapar; el cuerpo es HTML y los valores SÍ se
   * escapan (los escribe el profesional, pero los valores sustituidos son
   * datos del paciente).
   */
  renderizar(variables: Record<string, string>): EmailRecordatorioRenderizado {
    return {
      asunto: renderizarPlantilla(this.props.asunto, variables),
      html: renderizarPlantillaHtml(this.props.cuerpoHtml, variables),
    };
  }

  get id(): string {
    return this.props.id;
  }
  get nombre(): string {
    return this.props.nombre;
  }
  get asunto(): string {
    return this.props.asunto;
  }
  get cuerpoHtml(): string {
    return this.props.cuerpoHtml;
  }
  get diasAntes(): number | null {
    return this.props.diasAntes;
  }
  get predeterminada(): boolean {
    return this.props.predeterminada;
  }
  get activa(): boolean {
    return this.props.activa;
  }
  get incluirBotonConfirmacion(): boolean {
    return this.props.incluirBotonConfirmacion;
  }
  get botonCancelacion(): BotonCancelacion {
    return this.props.botonCancelacion;
  }
  get mensajeCancelacion(): string | null {
    return this.props.mensajeCancelacion;
  }

  aPrimitivos(): PropiedadesPlantillaEmailRecordatorio {
    return { ...this.props };
  }
}

function normalizar(datos: DatosPlantillaEmailRecordatorio): DatosNormalizados {
  return {
    ...datos,
    nombre: datos.nombre?.trim() ?? "",
    asunto: datos.asunto?.trim() ?? "",
    cuerpoHtml: datos.cuerpoHtml?.trim() ?? "",
    botonCancelacion: datos.botonCancelacion ?? "NINGUNO",
    mensajeCancelacion: datos.mensajeCancelacion?.trim() || null,
  };
}

function validar(d: DatosNormalizados): void {
  if (d.nombre.length === 0) {
    throw new ErrorValidacion("La plantilla necesita un nombre.");
  }
  if (d.nombre.length > 80) {
    throw new ErrorValidacion(
      "El nombre de la plantilla no puede superar los 80 caracteres.",
    );
  }
  if (d.asunto.length === 0) {
    throw new ErrorValidacion("La plantilla debe tener un asunto.");
  }
  if (d.cuerpoHtml.length === 0) {
    throw new ErrorValidacion("La plantilla no puede tener un cuerpo vacío.");
  }
  if (!BOTONES_CANCELACION.includes(d.botonCancelacion)) {
    throw new ErrorValidacion("El botón de cancelar no es válido.");
  }
  if ((d.mensajeCancelacion?.length ?? 0) > MAX_LARGO_MENSAJE_CANCELACION) {
    throw new ErrorValidacion(
      `El mensaje de cancelación no puede superar los ${MAX_LARGO_MENSAJE_CANCELACION} caracteres.`,
    );
  }
  if (
    d.diasAntes != null &&
    (!Number.isInteger(d.diasAntes) ||
      d.diasAntes < 0 ||
      d.diasAntes > MAX_DIAS_ANTES_PLANTILLA_EMAIL)
  ) {
    throw new ErrorValidacion(
      `El día asignado debe ser un entero de 0 a ${MAX_DIAS_ANTES_PLANTILLA_EMAIL}.`,
    );
  }
}
