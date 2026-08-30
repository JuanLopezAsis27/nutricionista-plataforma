import type { IRegistroDiarioRepositorio } from "@/dominio/repositorios/IRegistroDiarioRepositorio";
import type { IAsignacionPlanRepositorio } from "@/dominio/repositorios/IAsignacionPlanRepositorio";
import type { IAxiomaRepositorio } from "@/dominio/repositorios/IAxiomaRepositorio";
import type { IAntropometriaRepositorio } from "@/dominio/repositorios/IAntropometriaRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IMetricaDispositivoRepositorio } from "@/dominio/repositorios/IMetricaDispositivoRepositorio";
import type { MetricaDispositivo } from "@/dominio/entidades/MetricaDispositivo";
import type {
  AmbitoAxioma,
  OperadorAxioma,
} from "@/dominio/entidades/AxiomaNutricional";
import { AxiomaNutricional } from "@/dominio/entidades/AxiomaNutricional";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";

/** Adherencia del paciente a un axioma en el rango consultado. */
export interface AdherenciaAxioma {
  axiomaId: string;
  ambito: AmbitoAxioma;
  operador: OperadorAxioma;
  texto: string;
  /** Objetivo legible ("≥ 7 h", "2000 ml"…); null si es informativo. */
  objetivo: string | null;
  unidad: string | null;
  /** Días del rango con dato para evaluar este axioma. */
  diasEvaluados: number;
  diasCumplidos: number;
  /** % de cumplimiento (0–100); null si el axioma no es evaluable. */
  porcentaje: number | null;
  /** Promedio del valor del paciente en el rango; null si no hay datos. */
  promedioPaciente: number | null;
}

/** Concordancia entre lo que carga el paciente y las franjas de su plan. */
export interface ConcordanciaPlan {
  tienePlan: boolean;
  franjasPlanificadas: number;
  /** Días del rango con al menos un registro (base de la cobertura). */
  diasEvaluados: number;
  /** Cobertura promedio 0–100 (franjas registradas ÷ planificadas por día). */
  coberturaPromedio: number | null;
  porFranja: { franja: string; registrados: number; esperados: number }[];
}

/** Punto de la serie de peso. */
export interface PuntoPeso {
  fecha: Date;
  peso: number;
  fuente: "DIARIO" | "CONSULTA";
}

/** Read-model del tracking del paciente. */
export interface TrackingPaciente {
  desde: Date;
  hasta: Date;
  diasConRegistro: number;
  adherencia: AdherenciaAxioma[];
  concordancia: ConcordanciaPlan;
  peso: {
    puntos: PuntoPeso[];
    inicial: number | null;
    actual: number | null;
    variacion: number | null;
  };
}

/**
 * Extractores del valor diario del paciente por `parametro` de axioma. Un
 * parámetro no listado se considera informativo (no evaluable numéricamente).
 */
const EXTRACTORES: Record<
  string,
  (registro: {
    horasSueno: number | null;
    aguaMl: number | null;
    actividades: ReadonlyArray<{ duracionMinutos: number }>;
  }) => number | null
> = {
  horasSueno: (r) => r.horasSueno,
  aguaMl: (r) => r.aguaMl,
  actividadMinutosDia: (r) =>
    r.actividades.length > 0
      ? r.actividades.reduce((suma, a) => suma + a.duracionMinutos, 0)
      : null,
};

/**
 * Caso de uso: tracking del progreso del paciente. Compone su diario, el plan
 * activo, los axiomas activos y la antropometría para producir un read-model
 * con adherencia a los axiomas, concordancia con el plan y evolución de peso.
 * Lo consumen tanto el portal del paciente como la ficha del nutricionista.
 */
export class ObtenerTrackingDePaciente {
  constructor(
    private readonly pacientes: IPacienteRepositorio,
    private readonly registros: IRegistroDiarioRepositorio,
    private readonly planes: IAsignacionPlanRepositorio,
    private readonly axiomas: IAxiomaRepositorio,
    private readonly antropometrias: IAntropometriaRepositorio,
    private readonly metricas: IMetricaDispositivoRepositorio,
  ) {}

  async ejecutar(
    pacienteId: string,
    desde: Date,
    hasta: Date,
  ): Promise<TrackingPaciente> {
    const paciente = await this.pacientes.obtenerPorId(pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(pacienteId);
    }

    const [diario, plan, axiomasActivos, mediciones, metricas] =
      await Promise.all([
        this.registros.listarPorRango(pacienteId, desde, hasta),
        this.planes.obtenerPlanActivoDePaciente(pacienteId),
        this.axiomas.listarActivos(),
        this.antropometrias.listarPorPaciente(pacienteId),
        this.metricas.listarPorRango(pacienteId, desde, hasta),
      ]);

    const dias = diario.map((r) => r.aPrimitivos());
    // Para la adherencia a los axiomas, los días del diario se completan con los
    // datos del wearable de los días que el paciente decidió INCLUIR (opt-in).
    const diasAdherencia = fusionarConMetricas(dias, metricas);

    return {
      desde,
      hasta,
      diasConRegistro: dias.length,
      adherencia: calcularAdherencia(axiomasActivos, diasAdherencia),
      concordancia: calcularConcordancia(plan, dias),
      peso: calcularPeso(dias, mediciones, desde, hasta),
    };
  }
}

/** Día con los campos que la adherencia necesita (diario + wearable fusionados). */
interface DiaAdherencia {
  horasSueno: number | null;
  aguaMl: number | null;
  actividades: ReadonlyArray<{ duracionMinutos: number }>;
}

/**
 * Fusiona los días del diario con las métricas del wearable INCLUIDAS: si el
 * diario no tiene horas de sueño o actividad ese día, se usa el dato del
 * dispositivo. Los días con métrica incluida y sin registro de diario también
 * cuentan. El agua no proviene del wearable.
 */
function fusionarConMetricas(
  dias: {
    fecha: Date;
    horasSueno: number | null;
    aguaMl: number | null;
    actividades: ReadonlyArray<{ duracionMinutos: number }>;
  }[],
  metricas: MetricaDispositivo[],
): DiaAdherencia[] {
  const incluidas = new Map<
    string,
    { horasSueno: number | null; minutosActividad: number | null }
  >();
  for (const metrica of metricas) {
    if (!metrica.incluir) continue;
    const m = metrica.aPrimitivos();
    const clave = claveFecha(m.fecha);
    const previa = incluidas.get(clave);
    // Si un día tiene varias fuentes, se conserva el primer valor no nulo.
    incluidas.set(clave, {
      horasSueno: previa?.horasSueno ?? m.horasSueno,
      minutosActividad: previa?.minutosActividad ?? m.minutosActividad,
    });
  }

  const usadas = new Set<string>();
  const resultado: DiaAdherencia[] = dias.map((dia) => {
    const clave = claveFecha(dia.fecha);
    usadas.add(clave);
    const m = incluidas.get(clave);
    if (!m) {
      return {
        horasSueno: dia.horasSueno,
        aguaMl: dia.aguaMl,
        actividades: dia.actividades,
      };
    }
    return {
      horasSueno: dia.horasSueno ?? m.horasSueno,
      aguaMl: dia.aguaMl,
      actividades:
        dia.actividades.length > 0
          ? dia.actividades
          : m.minutosActividad != null
            ? [{ duracionMinutos: m.minutosActividad }]
            : [],
    };
  });

  for (const [clave, m] of incluidas) {
    if (usadas.has(clave)) continue;
    resultado.push({
      horasSueno: m.horasSueno,
      aguaMl: null,
      actividades:
        m.minutosActividad != null
          ? [{ duracionMinutos: m.minutosActividad }]
          : [],
    });
  }
  return resultado;
}

function claveFecha(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

function calcularAdherencia(
  axiomas: AxiomaNutricional[],
  dias: {
    horasSueno: number | null;
    aguaMl: number | null;
    actividades: ReadonlyArray<{ duracionMinutos: number }>;
  }[],
): AdherenciaAxioma[] {
  return axiomas.map((axioma) => {
    const a = axioma.aPrimitivos();
    const extractor = EXTRACTORES[a.parametro];
    const evaluable = extractor != null && a.operador !== "INFORMATIVO";

    let diasEvaluados = 0;
    let diasCumplidos = 0;
    let suma = 0;
    let conValor = 0;

    if (extractor) {
      for (const dia of dias) {
        const valor = extractor(dia);
        if (valor == null) continue;
        conValor += 1;
        suma += valor;
        if (evaluable) {
          const cumple = axioma.evaluar(valor);
          if (cumple !== null) {
            diasEvaluados += 1;
            if (cumple) diasCumplidos += 1;
          }
        }
      }
    }

    return {
      axiomaId: a.id,
      ambito: a.ambito,
      operador: a.operador,
      texto: a.texto,
      objetivo: objetivoLegible(a),
      unidad: a.unidad,
      diasEvaluados,
      diasCumplidos,
      porcentaje:
        evaluable && diasEvaluados > 0
          ? Math.round((diasCumplidos / diasEvaluados) * 100)
          : null,
      promedioPaciente:
        conValor > 0 ? Math.round((suma / conValor) * 10) / 10 : null,
    };
  });
}

function objetivoLegible(a: {
  operador: OperadorAxioma;
  valor: number | null;
  valorMax: number | null;
  unidad: string | null;
}): string | null {
  const unidad = a.unidad ? ` ${a.unidad}` : "";
  switch (a.operador) {
    case "MAYOR_IGUAL":
      return a.valor != null ? `≥ ${a.valor}${unidad}` : null;
    case "MENOR_IGUAL":
      return a.valor != null ? `≤ ${a.valor}${unidad}` : null;
    case "ENTRE":
      return a.valor != null && a.valorMax != null
        ? `${a.valor}–${a.valorMax}${unidad}`
        : null;
    default:
      return null;
  }
}

function calcularConcordancia(
  plan: { aPrimitivos(): { comidas: { nombre: string }[] } } | null,
  dias: { comidas: ReadonlyArray<{ franja: string }> }[],
): ConcordanciaPlan {
  const franjasPlan = plan
    ? plan.aPrimitivos().comidas.map((c) => c.nombre.trim())
    : [];
  const diasConRegistro = dias.filter((d) => d.comidas.length > 0);

  if (franjasPlan.length === 0) {
    return {
      tienePlan: plan != null,
      franjasPlanificadas: franjasPlan.length,
      diasEvaluados: diasConRegistro.length,
      coberturaPromedio: null,
      porFranja: [],
    };
  }

  const porFranja = franjasPlan.map((franja) => {
    const clave = franja.toLowerCase();
    const registrados = diasConRegistro.filter((dia) =>
      dia.comidas.some((c) => c.franja.trim().toLowerCase() === clave),
    ).length;
    return { franja, registrados, esperados: diasConRegistro.length };
  });

  const totalRegistrados = porFranja.reduce((s, f) => s + f.registrados, 0);
  const totalEsperados = diasConRegistro.length * franjasPlan.length;

  return {
    tienePlan: true,
    franjasPlanificadas: franjasPlan.length,
    diasEvaluados: diasConRegistro.length,
    coberturaPromedio:
      totalEsperados > 0
        ? Math.round((totalRegistrados / totalEsperados) * 100)
        : null,
    porFranja,
  };
}

function calcularPeso(
  dias: { fecha: Date; pesoKg: number | null }[],
  mediciones: { fecha: Date; aPrimitivos(): { pesoKg: number } }[],
  desde: Date,
  hasta: Date,
): TrackingPaciente["peso"] {
  const puntos: PuntoPeso[] = [];

  for (const medicion of mediciones) {
    if (medicion.fecha < desde || medicion.fecha > hasta) continue;
    puntos.push({
      fecha: medicion.fecha,
      peso: medicion.aPrimitivos().pesoKg,
      fuente: "CONSULTA",
    });
  }
  for (const dia of dias) {
    if (dia.pesoKg == null) continue;
    puntos.push({ fecha: dia.fecha, peso: dia.pesoKg, fuente: "DIARIO" });
  }

  puntos.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

  const inicial = puntos[0]?.peso ?? null;
  const actual = puntos[puntos.length - 1]?.peso ?? null;

  return {
    puntos,
    inicial,
    actual,
    variacion:
      inicial != null && actual != null
        ? Math.round((actual - inicial) * 10) / 10
        : null,
  };
}
