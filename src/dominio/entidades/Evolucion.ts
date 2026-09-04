import { ErrorValidacion } from "../errores/ErrorValidacion";

/**
 * Los campos fijos de una evolución: el repaso de control que el profesional
 * anota consulta a consulta.
 *
 * Son TEXTO LIBRE y no números a propósito. Lo que se escribe en la consulta
 * es «50%, 10 días no respetó por viaje» o «normales o constipada»: un
 * porcentaje solo perdería el motivo, que es la mitad del dato, y un enum de
 * tres opciones no tiene dónde poner la duda del profesional.
 *
 * Lo cuantitativo del seguimiento ya vive en otro lado —el peso y los pliegues
 * en `Antropometria`, la adherencia diaria en el diario del paciente—. Esto es
 * el relato de la consulta.
 */
export interface CamposEvolucion {
  cumplimientoDieta: string | null;
  entrenamiento: string | null;
  deposiciones: string | null;
  orina: string | null;
  descanso: string | null;
  indispuesta: string | null;
  sePercibe: string | null;
}

/**
 * Valor de un campo personalizado dentro de UNA evolución.
 *
 * Guarda la `etiqueta` junto al valor, y no solo la `clave`, por lo mismo que
 * la historia clínica: así la evolución se lee sola aunque después se borre la
 * definición del campo en Configuración.
 */
export interface CampoPersonalizadoEvolucion {
  /** Estable. Coincide con `CampoEvolucion.clave` si vino del consultorio. */
  clave: string;
  etiqueta: string;
  valor: string;
}

/** Tope de campos personalizados en una misma evolución. */
export const MAXIMO_CAMPOS_EN_EVOLUCION = 60;

/** Datos para crear o actualizar una evolución. */
export interface DatosNuevaEvolucion extends Partial<CamposEvolucion> {
  pacienteId: string;
  fecha: Date;
  camposPersonalizados?: CampoPersonalizadoEvolucion[];
}

/** Estado completo de una evolución persistida. */
export interface PropiedadesEvolucion extends CamposEvolucion {
  id: string;
  pacienteId: string;
  fecha: Date;
  camposPersonalizados: CampoPersonalizadoEvolucion[];
  creadoEn: Date;
  actualizadoEn: Date;
}

export const CAMPOS_EVOLUCION = [
  "cumplimientoDieta",
  "entrenamiento",
  "deposiciones",
  "orina",
  "descanso",
  "indispuesta",
  "sePercibe",
] as const satisfies readonly (keyof CamposEvolucion)[];

export type CampoFijoEvolucion = (typeof CAMPOS_EVOLUCION)[number];

/** Cómo se rotula cada campo fijo. Lo comparten el formulario, el PDF y la IA. */
export const ETIQUETAS_EVOLUCION: Record<CampoFijoEvolucion, string> = {
  cumplimientoDieta: "Cumplimiento dieta",
  entrenamiento: "Entrenamiento",
  deposiciones: "Deposiciones",
  orina: "Orina",
  descanso: "Descanso",
  indispuesta: "Indispuesta",
  sePercibe: "Se percibe",
};

/** Tope de caracteres por campo: es una nota de consulta, no un informe. */
const MAXIMO_LARGO_CAMPO = 2000;

/**
 * Entidad de dominio Evolución: el repaso de UNA consulta de control.
 *
 * Es la contracara cualitativa de `Antropometria`. Las dos son «una por
 * consulta» y las dos se ordenan por fecha, pero una guarda lo que se midió y
 * la otra lo que el paciente contó. Van separadas porque se cargan en momentos
 * distintos —la medición con el calibre en la mano, la evolución hablando— y
 * porque una consulta puede tener cualquiera de las dos sin la otra.
 *
 * Invariantes: pertenece a un paciente, la fecha no es futura y al menos un
 * campo tiene contenido (una evolución vacía no dice nada y no se guarda).
 */
export class Evolucion {
  private constructor(private readonly props: PropiedadesEvolucion) {}

  static crear(
    datos: DatosNuevaEvolucion,
    id: string,
    ahora: Date = new Date(),
  ): Evolucion {
    if (!datos.pacienteId?.trim()) {
      throw new ErrorValidacion("La evolución debe pertenecer a un paciente.");
    }
    validarFecha(datos.fecha, ahora);

    const campos = normalizarCampos(datos);
    const personalizados = normalizarPersonalizados(
      datos.camposPersonalizados ?? [],
    );
    // El invariante mira los dos conjuntos, igual que en la historia clínica:
    // una evolución cargada solo con campos del consultorio tiene contenido.
    if (
      CAMPOS_EVOLUCION.every((campo) => campos[campo] === null) &&
      personalizados.length === 0
    ) {
      throw new ErrorValidacion(
        "La evolución debe tener al menos un campo con contenido.",
      );
    }

    return new Evolucion({
      id,
      pacienteId: datos.pacienteId,
      fecha: datos.fecha,
      ...campos,
      camposPersonalizados: personalizados,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesEvolucion): Evolucion {
    return new Evolucion(props);
  }

  /** Versión actualizada e inmutable (revalida, preserva id y creadoEn). */
  actualizar(
    cambios: Partial<Omit<DatosNuevaEvolucion, "pacienteId">>,
    ahora: Date = new Date(),
  ): Evolucion {
    const actualizada = Evolucion.crear(
      {
        ...camposDe(this.props),
        pacienteId: this.props.pacienteId,
        fecha: this.props.fecha,
        camposPersonalizados: this.props.camposPersonalizados,
        ...cambios,
      },
      this.props.id,
      ahora,
    );
    return new Evolucion({
      ...actualizada.props,
      creadoEn: this.props.creadoEn,
    });
  }

  get id(): string {
    return this.props.id;
  }
  get pacienteId(): string {
    return this.props.pacienteId;
  }
  get fecha(): Date {
    return this.props.fecha;
  }
  get camposPersonalizados(): CampoPersonalizadoEvolucion[] {
    return [...this.props.camposPersonalizados];
  }

  aPrimitivos(): PropiedadesEvolucion {
    return {
      ...this.props,
      camposPersonalizados: [...this.props.camposPersonalizados],
    };
  }
}

function validarFecha(fecha: Date, ahora: Date): void {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
    throw new ErrorValidacion("La fecha de la evolución no es válida.");
  }
  // En UTC, igual que la fecha de una medición: es un DATE a medianoche UTC y
  // leerlo en horario local corre el día para atrás al oeste de Greenwich.
  const hoy = Date.UTC(
    ahora.getUTCFullYear(),
    ahora.getUTCMonth(),
    ahora.getUTCDate(),
  );
  const dia = Date.UTC(
    fecha.getUTCFullYear(),
    fecha.getUTCMonth(),
    fecha.getUTCDate(),
  );
  if (dia > hoy) {
    throw new ErrorValidacion("La fecha de la evolución no puede ser futura.");
  }
}

function normalizarCampos(datos: Partial<CamposEvolucion>): CamposEvolucion {
  const resultado = {} as CamposEvolucion;
  for (const campo of CAMPOS_EVOLUCION) {
    const valor = datos[campo]?.trim() || null;
    if (valor !== null && valor.length > MAXIMO_LARGO_CAMPO) {
      throw new ErrorValidacion(
        `El campo "${ETIQUETAS_EVOLUCION[campo]}" no puede superar los ${MAXIMO_LARGO_CAMPO} caracteres.`,
      );
    }
    resultado[campo] = valor;
  }
  return resultado;
}

function camposDe(props: PropiedadesEvolucion): CamposEvolucion {
  const resultado = {} as CamposEvolucion;
  for (const campo of CAMPOS_EVOLUCION) {
    resultado[campo] = props[campo];
  }
  return resultado;
}

/**
 * Deja los campos personalizados listos para guardar: descarta los vacíos,
 * unifica claves repetidas (gana el último) y corta en el tope.
 *
 * Mismo criterio que la historia clínica: un campo sin valor no aporta nada, y
 * la lista de campos que se MUESTRAN sale de la definición del consultorio, no
 * de lo que quedó escrito en la evolución.
 */
function normalizarPersonalizados(
  campos: CampoPersonalizadoEvolucion[],
): CampoPersonalizadoEvolucion[] {
  const porClave = new Map<string, CampoPersonalizadoEvolucion>();
  for (const campo of campos) {
    const clave = campo?.clave?.trim();
    const valor = campo?.valor?.trim();
    const etiqueta = campo?.etiqueta?.trim();
    if (!clave || !valor || !etiqueta) continue;
    if (valor.length > MAXIMO_LARGO_CAMPO) {
      throw new ErrorValidacion(
        `El campo "${etiqueta}" no puede superar los ${MAXIMO_LARGO_CAMPO} caracteres.`,
      );
    }
    porClave.set(clave, { clave, etiqueta, valor });
  }
  const resultado = [...porClave.values()];
  if (resultado.length > MAXIMO_CAMPOS_EN_EVOLUCION) {
    throw new ErrorValidacion(
      `La evolución no puede tener más de ${MAXIMO_CAMPOS_EN_EVOLUCION} campos personalizados.`,
    );
  }
  return resultado;
}
