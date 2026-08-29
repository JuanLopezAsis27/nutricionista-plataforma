import { ErrorValidacion } from "../errores/ErrorValidacion";
import type {
  MedidasComposicion,
  NivelActividad,
} from "../servicios/composicionCorporal";
import { METODOS_GRASA, type MetodoGrasa } from "../servicios/grasaPorPliegues";

/**
 * Modelo que el profesional destaca en la consulta. No restringe el cálculo:
 * el dominio computa siempre los dos si las medidas alcanzan.
 */
export const PROTOCOLOS_COMPOSICION = [
  "CINCO_COMPONENTES",
  "DOS_COMPONENTES",
] as const;
export type ProtocoloComposicion = (typeof PROTOCOLOS_COMPOSICION)[number];

/**
 * Medidas crudas de una consulta (todas opcionales salvo el peso).
 * Es el perfil ISAK completo de la planilla del profesional: cuantas más se
 * carguen, más bloques puede calcular `composicionCorporal`.
 */
export interface MedidasAntropometricas {
  pesoKg: number;
  tallaCm: number | null;
  tallaSentadoCm: number | null;
  /** Nivel de actividad al momento de la medición (cambia entre consultas). */
  nivelActividad: NivelActividad | null;
  /** Modelo a destacar. No limita qué se calcula, solo qué se muestra primero. */
  protocolo: ProtocoloComposicion;
  /** Ecuación de pliegues destacada; null = la primera que se pueda calcular. */
  metodoGrasa: MetodoGrasa | null;
  // Diámetros óseos (cm)
  diamBiacromial: number | null;
  diamToraxTransverso: number | null;
  diamToraxAnteroposterior: number | null;
  diamBiiliocrestideo: number | null;
  diamHumeral: number | null;
  diamFemoral: number | null;
  // Pliegues (mm)
  pliegueTricipital: number | null;
  pliegueSubescapular: number | null;
  pliegueSupraespinal: number | null;
  pliegueAbdominal: number | null;
  pliegueMuslo: number | null;
  plieguePantorrilla: number | null;
  pliegueBicipital: number | null;
  pliegueCrestaIliaca: number | null;
  // Circunferencias (cm)
  circTorax: number | null;
  circCinturaMinima: number | null;
  circCinturaMaxima: number | null;
  circCadera: number | null;
  circBrazo: number | null;
  circBrazoContraido: number | null;
  circCabeza: number | null;
  circAntebrazo: number | null;
  circMusloMaximo: number | null;
  circMusloMedial: number | null;
  circPantorrilla: number | null;
  /** Kg de grasa según la fórmula propia del profesional (se carga manualmente). */
  kgGrasa: number | null;
}

/** Datos para registrar una medición nueva. */
export interface DatosNuevaAntropometria extends Partial<MedidasAntropometricas> {
  pacienteId: string;
  fecha: Date;
  pesoKg: number;
  observaciones?: string | null;
}

/** Estado completo de una medición persistida. */
export interface PropiedadesAntropometria extends MedidasAntropometricas {
  id: string;
  pacienteId: string;
  fecha: Date;
  observaciones: string | null;
  creadoEn: Date;
}

/** Derivados calculados de una medición dentro de la evolución del paciente. */
export interface DerivadosMedicion {
  /** Σ de los 6 pliegues de la planilla (tricipital, subescapular, supraespinal, abdominal, muslo, pantorrilla). */
  sumatoria6Pliegues: number | null;
  /** Peso anterior − peso actual (positivo = bajó). Null en la primera medición. */
  kgBajadosVsAnterior: number | null;
  /** Peso inicial − peso actual. Null en la primera medición. */
  kgBajadosAcumulados: number | null;
}

const CAMPOS_PLIEGUES = [
  "pliegueTricipital",
  "pliegueSubescapular",
  "pliegueSupraespinal",
  "pliegueAbdominal",
  "pliegueMuslo",
  "plieguePantorrilla",
  "pliegueBicipital",
  "pliegueCrestaIliaca",
] as const satisfies readonly (keyof MedidasAntropometricas)[];

const CAMPOS_CIRCUNFERENCIAS = [
  "circTorax",
  "circCinturaMinima",
  "circCinturaMaxima",
  "circCadera",
  "circBrazo",
  "circBrazoContraido",
  "circCabeza",
  "circAntebrazo",
  "circMusloMaximo",
  "circMusloMedial",
  "circPantorrilla",
] as const satisfies readonly (keyof MedidasAntropometricas)[];

/** Diámetros óseos: rango más estrecho que las circunferencias. */
const CAMPOS_DIAMETROS = [
  "diamBiacromial",
  "diamToraxTransverso",
  "diamToraxAnteroposterior",
  "diamBiiliocrestideo",
  "diamHumeral",
  "diamFemoral",
] as const satisfies readonly (keyof MedidasAntropometricas)[];

/** Los 6 pliegues que suma la planilla del profesional (ISAK). */
const PLIEGUES_SUMATORIA_6 = [
  "pliegueTricipital",
  "pliegueSubescapular",
  "pliegueSupraespinal",
  "pliegueAbdominal",
  "pliegueMuslo",
  "plieguePantorrilla",
] as const satisfies readonly (keyof MedidasAntropometricas)[];

/**
 * Entidad de dominio Antropometría: una medición de consulta, fiel a la
 * planilla del profesional (peso, talla, 8 pliegues, 6 circunferencias,
 * kg grasa). Los derivados (Σ6 pliegues, kg bajados) se calculan acá y
 * nunca se persisten.
 *
 * Invariantes: peso 20–400 kg, talla 100–250 cm, pliegues 1–80 mm,
 * circunferencias 20–250 cm, kg grasa 0–150, fecha no futura.
 */
export class Antropometria {
  private constructor(private readonly props: PropiedadesAntropometria) {}

  static crear(
    datos: DatosNuevaAntropometria,
    id: string,
    ahora: Date = new Date(),
  ): Antropometria {
    if (!datos.pacienteId?.trim()) {
      throw new ErrorValidacion("La medición debe pertenecer a un paciente.");
    }
    validarFecha(datos.fecha, ahora);
    validarMedidas(datos);

    return new Antropometria({
      id,
      pacienteId: datos.pacienteId,
      fecha: datos.fecha,
      pesoKg: datos.pesoKg,
      tallaCm: datos.tallaCm ?? null,
      tallaSentadoCm: datos.tallaSentadoCm ?? null,
      nivelActividad: datos.nivelActividad ?? null,
      protocolo: datos.protocolo ?? "DOS_COMPONENTES",
      metodoGrasa: datos.metodoGrasa ?? null,
      diamBiacromial: datos.diamBiacromial ?? null,
      diamToraxTransverso: datos.diamToraxTransverso ?? null,
      diamToraxAnteroposterior: datos.diamToraxAnteroposterior ?? null,
      diamBiiliocrestideo: datos.diamBiiliocrestideo ?? null,
      diamHumeral: datos.diamHumeral ?? null,
      diamFemoral: datos.diamFemoral ?? null,
      pliegueTricipital: datos.pliegueTricipital ?? null,
      pliegueSubescapular: datos.pliegueSubescapular ?? null,
      pliegueSupraespinal: datos.pliegueSupraespinal ?? null,
      pliegueAbdominal: datos.pliegueAbdominal ?? null,
      pliegueMuslo: datos.pliegueMuslo ?? null,
      plieguePantorrilla: datos.plieguePantorrilla ?? null,
      pliegueBicipital: datos.pliegueBicipital ?? null,
      pliegueCrestaIliaca: datos.pliegueCrestaIliaca ?? null,
      circTorax: datos.circTorax ?? null,
      circCinturaMinima: datos.circCinturaMinima ?? null,
      circCinturaMaxima: datos.circCinturaMaxima ?? null,
      circCadera: datos.circCadera ?? null,
      circBrazo: datos.circBrazo ?? null,
      circBrazoContraido: datos.circBrazoContraido ?? null,
      circCabeza: datos.circCabeza ?? null,
      circAntebrazo: datos.circAntebrazo ?? null,
      circMusloMaximo: datos.circMusloMaximo ?? null,
      circMusloMedial: datos.circMusloMedial ?? null,
      circPantorrilla: datos.circPantorrilla ?? null,
      kgGrasa: datos.kgGrasa ?? null,
      observaciones: datos.observaciones?.trim() || null,
      creadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesAntropometria): Antropometria {
    return new Antropometria(props);
  }

  /**
   * Versión actualizada e inmutable de la medición (revalida invariantes,
   * preserva id, pacienteId y creadoEn).
   */
  actualizar(
    cambios: Partial<Omit<DatosNuevaAntropometria, "pacienteId">>,
    ahora: Date = new Date(),
  ): Antropometria {
    return Antropometria.crear(
      {
        ...this.props,
        ...cambios,
        pacienteId: this.props.pacienteId,
        observaciones:
          cambios.observaciones !== undefined
            ? cambios.observaciones
            : this.props.observaciones,
      },
      this.props.id,
      ahora,
    ).conCreadoEn(this.props.creadoEn);
  }

  private conCreadoEn(creadoEn: Date): Antropometria {
    return new Antropometria({ ...this.props, creadoEn });
  }

  /** Σ de los 6 pliegues de la planilla; null si falta alguno. */
  sumatoria6Pliegues(): number | null {
    let suma = 0;
    for (const campo of PLIEGUES_SUMATORIA_6) {
      const valor = this.props[campo];
      if (valor == null) return null;
      suma += valor;
    }
    return redondear(suma, 1);
  }

  /**
   * Derivados por medición para la vista de evolución (como la planilla:
   * "KG BAJADOS" = peso anterior − peso actual). Ordena por fecha ascendente.
   */
  static calcularDerivados(
    mediciones: readonly Antropometria[],
  ): DerivadosMedicion[] {
    const ordenadas = [...mediciones].sort(
      (a, b) => a.fecha.getTime() - b.fecha.getTime(),
    );
    const pesoInicial = ordenadas[0]?.pesoKg ?? null;

    return ordenadas.map((medicion, indice) => {
      const anterior = indice > 0 ? ordenadas[indice - 1] : undefined;
      return {
        sumatoria6Pliegues: medicion.sumatoria6Pliegues(),
        kgBajadosVsAnterior: anterior
          ? redondear(anterior.pesoKg - medicion.pesoKg, 2)
          : null,
        kgBajadosAcumulados:
          indice > 0 && pesoInicial != null
            ? redondear(pesoInicial - medicion.pesoKg, 2)
            : null,
      };
    });
  }

  /**
   * Vista de la medición como entrada del cálculo de composición corporal.
   * Traduce el vocabulario de la planilla al del modelo de Kerr; la cintura
   * que entra al fraccionamiento es la MÍNIMA (es la que define el protocolo
   * ISAK), no la máxima.
   */
  medidasComposicion(): MedidasComposicion {
    const p = this.props;
    return {
      pesoKg: p.pesoKg,
      tallaCm: p.tallaCm,
      tallaSentadoCm: p.tallaSentadoCm,
      diamBiacromial: p.diamBiacromial,
      diamToraxTransverso: p.diamToraxTransverso,
      diamToraxAnteroposterior: p.diamToraxAnteroposterior,
      diamBiiliocrestideo: p.diamBiiliocrestideo,
      diamHumeral: p.diamHumeral,
      diamFemoral: p.diamFemoral,
      circCabeza: p.circCabeza,
      circBrazo: p.circBrazo,
      circBrazoContraido: p.circBrazoContraido,
      circAntebrazo: p.circAntebrazo,
      circTorax: p.circTorax,
      circCinturaMinima: p.circCinturaMinima,
      circCadera: p.circCadera,
      circMusloMaximo: p.circMusloMaximo,
      circMusloMedial: p.circMusloMedial,
      circPantorrilla: p.circPantorrilla,
      pliegueTricipital: p.pliegueTricipital,
      pliegueSubescapular: p.pliegueSubescapular,
      pliegueSupraespinal: p.pliegueSupraespinal,
      pliegueAbdominal: p.pliegueAbdominal,
      pliegueMuslo: p.pliegueMuslo,
      plieguePantorrilla: p.plieguePantorrilla,
      pliegueBicipital: p.pliegueBicipital,
      pliegueCrestaIliaca: p.pliegueCrestaIliaca,
    };
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
  get pesoKg(): number {
    return this.props.pesoKg;
  }
  get nivelActividad(): NivelActividad | null {
    return this.props.nivelActividad;
  }
  get protocolo(): ProtocoloComposicion {
    return this.props.protocolo;
  }
  get metodoGrasa(): MetodoGrasa | null {
    return this.props.metodoGrasa;
  }
  get observaciones(): string | null {
    return this.props.observaciones;
  }
  get creadoEn(): Date {
    return this.props.creadoEn;
  }

  aPrimitivos(): PropiedadesAntropometria {
    return { ...this.props };
  }
}

function validarFecha(fecha: Date, ahora: Date): void {
  if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
    throw new ErrorValidacion("La fecha de la medición no es válida.");
  }
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
    throw new ErrorValidacion("La fecha de la medición no puede ser futura.");
  }
}

function validarMedidas(
  datos: Partial<MedidasAntropometricas> & { pesoKg: number },
): void {
  validarRango(datos.pesoKg, 20, 400, "El peso debe estar entre 20 y 400 kg.");
  if (datos.tallaCm != null) {
    validarRango(
      datos.tallaCm,
      100,
      250,
      "La talla debe estar entre 100 y 250 cm.",
    );
  }
  if (datos.tallaSentadoCm != null) {
    validarRango(
      datos.tallaSentadoCm,
      50,
      150,
      "La talla sentado debe estar entre 50 y 150 cm.",
    );
  }
  for (const campo of CAMPOS_DIAMETROS) {
    const valor = datos[campo];
    if (valor != null) {
      validarRango(
        valor,
        2,
        60,
        `El diámetro debe estar entre 2 y 60 cm (${campo}).`,
      );
    }
  }
  for (const campo of CAMPOS_PLIEGUES) {
    const valor = datos[campo];
    if (valor != null) {
      validarRango(
        valor,
        1,
        80,
        `El pliegue debe estar entre 1 y 80 mm (${campo}).`,
      );
    }
  }
  for (const campo of CAMPOS_CIRCUNFERENCIAS) {
    const valor = datos[campo];
    if (valor != null) {
      validarRango(
        valor,
        20,
        250,
        `La circunferencia debe estar entre 20 y 250 cm (${campo}).`,
      );
    }
  }
  if (
    datos.protocolo != null &&
    !PROTOCOLOS_COMPOSICION.includes(datos.protocolo)
  ) {
    throw new ErrorValidacion("El protocolo de la medición no es válido.");
  }
  if (datos.metodoGrasa != null && !METODOS_GRASA.includes(datos.metodoGrasa)) {
    throw new ErrorValidacion("El método de estimación de grasa no es válido.");
  }
  if (datos.kgGrasa != null) {
    validarRango(
      datos.kgGrasa,
      0,
      150,
      "Los kg de grasa deben estar entre 0 y 150.",
    );
  }
}

function validarRango(
  valor: number,
  min: number,
  max: number,
  mensaje: string,
): void {
  if (!Number.isFinite(valor) || valor < min || valor > max) {
    throw new ErrorValidacion(mensaje);
  }
}

function redondear(valor: number, decimales: number): number {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}
