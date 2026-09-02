import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Campos de contenido de la historia clínica (todos opcionales). */
export interface CamposHistoriaClinica {
  motivoConsulta: string | null;
  diagnosticos: string | null;
  medicacion: string | null;
  antecedentesPersonales: string | null;
  antecedentesFamiliares: string | null;
  habitos: string | null;
  contexto: string | null;
}

/**
 * Valor de un campo personalizado dentro de la historia de UN paciente.
 *
 * Guarda la `etiqueta` junto al valor, y no solo la `clave`, a propósito: así
 * la historia se lee sola. Un campo del consultorio que después se borra (o un
 * campo suelto, que nunca tuvo definición) sigue mostrando qué era, en vez de
 * quedar como un texto colgado de una clave que ya no resuelve contra nada.
 * Es el mismo criterio que `AsignacionPlan.nombrePlan`.
 */
export interface CampoPersonalizadoHistoria {
  /** Estable. Coincide con `CampoHistoriaClinica.clave` si vino del consultorio. */
  clave: string;
  etiqueta: string;
  valor: string;
}

/** Tope de campos sueltos + del consultorio en una misma historia. */
export const MAXIMO_CAMPOS_EN_HISTORIA = 60;

/** Datos para crear o actualizar la historia clínica. */
export interface DatosHistoriaClinica extends Partial<CamposHistoriaClinica> {
  pacienteId: string;
  camposPersonalizados?: CampoPersonalizadoHistoria[];
}

/** Estado completo de una historia clínica persistida. */
export interface PropiedadesHistoriaClinica extends CamposHistoriaClinica {
  id: string;
  pacienteId: string;
  camposPersonalizados: CampoPersonalizadoHistoria[];
  actualizadoEn: Date;
}

const CAMPOS_CONTENIDO = [
  "motivoConsulta",
  "diagnosticos",
  "medicacion",
  "antecedentesPersonales",
  "antecedentesFamiliares",
  "habitos",
  "contexto",
] as const satisfies readonly (keyof CamposHistoriaClinica)[];

/**
 * Entidad de dominio Historia Clínica (una por paciente).
 *
 * Invariantes: pertenece a un paciente y al menos un campo tiene contenido
 * (una historia completamente vacía no se guarda).
 */
export class HistoriaClinica {
  private constructor(private readonly props: PropiedadesHistoriaClinica) {}

  static crear(
    datos: DatosHistoriaClinica,
    id: string,
    ahora: Date = new Date(),
  ): HistoriaClinica {
    if (!datos.pacienteId?.trim()) {
      throw new ErrorValidacion(
        "La historia clínica debe pertenecer a un paciente.",
      );
    }

    const campos = normalizarCampos(datos);
    const personalizados = normalizarPersonalizados(
      datos.camposPersonalizados ?? [],
    );
    // El invariante mira los dos conjuntos: una historia que SOLO tiene
    // campos personalizados cargados es una historia con contenido.
    if (
      CAMPOS_CONTENIDO.every((campo) => campos[campo] === null) &&
      personalizados.length === 0
    ) {
      throw new ErrorValidacion(
        "La historia clínica debe tener al menos un campo con contenido.",
      );
    }

    return new HistoriaClinica({
      id,
      pacienteId: datos.pacienteId,
      ...campos,
      camposPersonalizados: personalizados,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesHistoriaClinica): HistoriaClinica {
    return new HistoriaClinica(props);
  }

  /** Versión actualizada e inmutable (reemplaza los campos informados). */
  actualizar(
    cambios: Partial<CamposHistoriaClinica> & {
      camposPersonalizados?: CampoPersonalizadoHistoria[];
    },
    ahora: Date = new Date(),
  ): HistoriaClinica {
    return HistoriaClinica.crear(
      {
        pacienteId: this.props.pacienteId,
        ...camposDe(this.props),
        camposPersonalizados: this.props.camposPersonalizados,
        ...cambios,
      },
      this.props.id,
      ahora,
    );
  }

  get id(): string {
    return this.props.id;
  }
  get pacienteId(): string {
    return this.props.pacienteId;
  }
  get actualizadoEn(): Date {
    return this.props.actualizadoEn;
  }
  get camposPersonalizados(): CampoPersonalizadoHistoria[] {
    return [...this.props.camposPersonalizados];
  }

  aPrimitivos(): PropiedadesHistoriaClinica {
    return {
      ...this.props,
      camposPersonalizados: [...this.props.camposPersonalizados],
    };
  }
}

function normalizarCampos(
  datos: Partial<CamposHistoriaClinica>,
): CamposHistoriaClinica {
  const resultado = {} as CamposHistoriaClinica;
  for (const campo of CAMPOS_CONTENIDO) {
    resultado[campo] = datos[campo]?.trim() || null;
  }
  return resultado;
}

function camposDe(props: PropiedadesHistoriaClinica): CamposHistoriaClinica {
  const resultado = {} as CamposHistoriaClinica;
  for (const campo of CAMPOS_CONTENIDO) {
    resultado[campo] = props[campo];
  }
  return resultado;
}

/**
 * Deja los campos personalizados listos para guardar: descarta los vacíos,
 * unifica claves repetidas (gana el último) y corta en el tope.
 *
 * Los vacíos se DESCARTAN en vez de guardarse en null porque un campo sin
 * valor no aporta nada a la historia: la lista de campos que se muestran sale
 * de la definición del consultorio, no de lo que quedó escrito en el paciente.
 */
function normalizarPersonalizados(
  campos: CampoPersonalizadoHistoria[],
): CampoPersonalizadoHistoria[] {
  const porClave = new Map<string, CampoPersonalizadoHistoria>();
  for (const campo of campos) {
    const clave = campo?.clave?.trim();
    const valor = campo?.valor?.trim();
    const etiqueta = campo?.etiqueta?.trim();
    if (!clave || !valor || !etiqueta) continue;
    porClave.set(clave, { clave, etiqueta, valor });
  }
  const resultado = [...porClave.values()];
  if (resultado.length > MAXIMO_CAMPOS_EN_HISTORIA) {
    throw new ErrorValidacion(
      `La historia clínica no puede tener más de ${MAXIMO_CAMPOS_EN_HISTORIA} campos personalizados.`,
    );
  }
  return resultado;
}
