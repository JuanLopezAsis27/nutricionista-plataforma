import type { IAntropometriaRepositorio } from "../../repositorios/IAntropometriaRepositorio";
import type { IObjetivoComposicionRepositorio } from "../../repositorios/IObjetivoComposicionRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import type { Antropometria } from "../../entidades/Antropometria";
import type { ObjetivoComposicion } from "../../entidades/ObjetivoComposicion";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";
import {
  calcularComposicion,
  type ResultadoComposicion,
  type SexoBiologico,
} from "../../servicios/composicionCorporal";
import {
  proyectarObjetivo,
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

/** Foto completa de la composición corporal de un paciente. */
export interface ComposicionCorporal {
  sexo: SexoBiologico | null;
  fechaNacimiento: Date | null;
  /** Mediciones analizadas, de la más vieja a la más nueva. */
  mediciones: MedicionAnalizada[];
  objetivos: {
    objetivo: ObjetivoComposicion;
    proyeccion: ProyeccionObjetivo;
  }[];
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
      mediciones: analizadas,
      objetivos: objetivos.map((objetivo) => ({
        objetivo,
        proyeccion: proyectarObjetivo(
          {
            variable: objetivo.variable,
            valorObjetivo: objetivo.valorObjetivo,
            fechaObjetivo: objetivo.fechaObjetivo,
          },
          serieDeVariable(analizadas, objetivo),
          ahora,
        ),
      })),
    };
  }
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

function edadEnFecha(nacimiento: Date | null, fecha: Date): number | null {
  if (nacimiento == null) return null;
  const anios = (fecha.getTime() - nacimiento.getTime()) / MS_POR_ANIO;
  return anios > 0 && anios < 130 ? Math.round(anios * 100) / 100 : null;
}
