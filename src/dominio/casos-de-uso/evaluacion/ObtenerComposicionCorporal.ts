import type { IAntropometriaRepositorio } from "../../repositorios/IAntropometriaRepositorio";
import type { IObjetivoComposicionRepositorio } from "../../repositorios/IObjetivoComposicionRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import type { Antropometria } from "../../entidades/Antropometria";
import {
  VARIABLES_COMPOSICION,
  exigeMetodoGrasa,
  type ObjetivoComposicion,
  type VariableComposicion,
} from "../../entidades/ObjetivoComposicion";
import type {
  MetodoGrasa,
  ProyeccionPliegues,
} from "../../servicios/grasaPorPliegues";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";
import {
  calcularComposicion,
  type ResultadoComposicion,
  type SexoBiologico,
} from "../../servicios/composicionCorporal";
import {
  proyectarObjetivo,
  proyectarPlieguesParaMeta,
  valorDeVariable,
  type ProyeccionObjetivo,
  type PuntoSerie,
} from "../../servicios/proyeccionComposicion";

/** Una medición con todo lo que el dominio pudo derivar de ella. */
export interface MedicionAnalizada {
  medicion: Antropometria;
  /** Edad del paciente el día de la medición; null sin fecha de nacimiento. */
  edadAnios: number | null;
  resultado: ResultadoComposicion;
}

/**
 * Valor que hoy tiene una variable objetivable, según la última medición.
 * Es lo que necesita el formulario de objetivos para arrancar del dato real
 * en vez de una casilla vacía.
 */
export interface ValorActualVariable {
  variable: VariableComposicion;
  /** Ecuación de la que sale el valor; null en las variables que no la usan. */
  metodoGrasa: MetodoGrasa | null;
  valor: number;
}

/** Foto completa de la composición corporal de un paciente. */
export interface ComposicionCorporal {
  sexo: SexoBiologico | null;
  fechaNacimiento: Date | null;
  /** Mediciones analizadas, de la más vieja a la más nueva. */
  mediciones: MedicionAnalizada[];
  objetivos: {
    objetivo: ObjetivoComposicion;
    proyeccion: ProyeccionObjetivo;
    /**
     * Cómo tendrían que quedar los pliegues para alcanzar la meta. Solo en
     * los objetivos que se traducen a una Σ de pliegues; null en los demás.
     */
    proyeccionPliegues: ProyeccionPliegues | null;
  }[];
  /** Punto de partida para plantear metas nuevas (de la última medición). */
  valoresActuales: ValorActualVariable[];
}

const MS_POR_ANIO = 365.25 * 24 * 60 * 60 * 1000;

/**
 * Caso de uso: analizar toda la antropometría de un paciente.
 *
 * Recalcula cada medición desde las medidas crudas —nada derivado está
 * persistido— y proyecta los objetivos contra la serie resultante. Es la
 * única fuente del dashboard de composición corporal.
 */
export class ObtenerComposicionCorporal {
  constructor(
    private readonly antropometrias: IAntropometriaRepositorio,
    private readonly objetivos: IObjetivoComposicionRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(
    pacienteId: string,
    ahora: Date = new Date(),
  ): Promise<ComposicionCorporal> {
    const paciente = await this.pacientes.obtenerPorId(pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(pacienteId);
    }

    const [mediciones, objetivos] = await Promise.all([
      this.antropometrias.listarPorPaciente(pacienteId),
      this.objetivos.listarPorPaciente(pacienteId),
    ]);

    const { sexo, fechaNacimiento } = paciente.aPrimitivos();
    const analizadas: MedicionAnalizada[] = mediciones
      .slice()
      .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
      .map((medicion) => {
        // La edad se toma a la fecha de la medición, no la de hoy: un informe
        // de hace tres años tiene que seguir dando el mismo metabolismo basal.
        const edadAnios = edadEnFecha(fechaNacimiento, medicion.fecha);
        return {
          medicion,
          edadAnios,
          resultado: calcularComposicion(medicion.medidasComposicion(), {
            sexo,
            edadAnios,
            nivelActividad: medicion.nivelActividad,
          }),
        };
      });

    return {
      sexo,
      fechaNacimiento,
      valoresActuales: valoresDeLaUltima(analizadas),
      mediciones: analizadas,
      objetivos: objetivos.map((objetivo) => ({
        objetivo,
        proyeccionPliegues: proyectarPlieguesDelObjetivo(
          objetivo,
          analizadas[analizadas.length - 1] ?? null,
          sexo,
        ),
        proyeccion: proyectarObjetivo(
          {
            variable: objetivo.variable,
            valorObjetivo: objetivo.valorObjetivo,
            fechaObjetivo: objetivo.fechaObjetivo,
            // El progreso se mide desde que la meta existe, no desde la
            // primera medición del paciente.
            creadoEn: objetivo.aPrimitivos().creadoEn,
          },
          serieDeVariable(analizadas, objetivo),
          ahora,
        ),
      })),
    };
  }
}

/**
 * Pliegues proyectados para alcanzar la meta. Solo las metas de adiposidad
 * los definen: el resto (peso, músculo, IMC) no dice nada sobre cómo
 * repartirlos, y ahí no hay proyección que mostrar.
 */
function proyectarPlieguesDelObjetivo(
  objetivo: ObjetivoComposicion,
  ultima: MedicionAnalizada | null,
  sexo: SexoBiologico | null,
): ProyeccionPliegues | null {
  if (ultima == null) return null;

  return proyectarPlieguesParaMeta(
    {
      variable: objetivo.variable,
      metodoGrasa: objetivo.metodoGrasa,
      valorObjetivo: objetivo.valorObjetivo,
    },
    ultima.medicion.medidasComposicion(),
    {
      sexo,
      edadAnios: ultima.edadAnios,
      nivelActividad: ultima.medicion.nivelActividad,
    },
  );
}

/**
 * Serie histórica de la variable del objetivo. Las mediciones que no la
 * permiten calcular quedan afuera en vez de contarse como cero.
 */
function serieDeVariable(
  analizadas: readonly MedicionAnalizada[],
  objetivo: ObjetivoComposicion,
): PuntoSerie[] {
  const puntos: PuntoSerie[] = [];
  for (const { medicion, resultado } of analizadas) {
    const valor = valorDeVariable(
      objetivo.variable,
      medicion.medidasComposicion(),
      resultado,
      objetivo.metodoGrasa,
    );
    if (valor != null) {
      puntos.push({ fecha: medicion.fecha, valor });
    }
  }
  return puntos;
}

/**
 * Valor actual de cada variable objetivable, leído de la última medición.
 *
 * Las variables de grasa dan un valor POR ECUACIÓN: no hay un "% graso" a
 * secas, hay uno por método, y el formulario tiene que ofrecer el del método
 * que se elija.
 */
function valoresDeLaUltima(
  analizadas: readonly MedicionAnalizada[],
): ValorActualVariable[] {
  const ultima = analizadas[analizadas.length - 1];
  if (!ultima) return [];

  const medidas = ultima.medicion.medidasComposicion();
  const valores: ValorActualVariable[] = [];

  for (const variable of VARIABLES_COMPOSICION) {
    if (exigeMetodoGrasa(variable)) {
      for (const resultado of ultima.resultado.grasaPorPliegues.resultados) {
        const valor = valorDeVariable(
          variable,
          medidas,
          ultima.resultado,
          resultado.metodo,
        );
        if (valor != null) {
          valores.push({ variable, metodoGrasa: resultado.metodo, valor });
        }
      }
      continue;
    }

    const valor = valorDeVariable(variable, medidas, ultima.resultado);
    if (valor != null) {
      valores.push({ variable, metodoGrasa: null, valor });
    }
  }

  return valores;
}

function edadEnFecha(nacimiento: Date | null, fecha: Date): number | null {
  if (nacimiento == null) return null;
  const anios = (fecha.getTime() - nacimiento.getTime()) / MS_POR_ANIO;
  return anios > 0 && anios < 130 ? Math.round(anios * 100) / 100 : null;
}
