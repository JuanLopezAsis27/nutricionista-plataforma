import type { IBioimpedanciaRepositorio } from "@/dominio/repositorios/IBioimpedanciaRepositorio";
import type { IObjetivoBioimpedanciaRepositorio } from "@/dominio/repositorios/IObjetivoBioimpedanciaRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { Bioimpedancia } from "@/dominio/entidades/Bioimpedancia";
import {
  VARIABLES_BIOIMPEDANCIA,
  definicionVariableBioimpedancia,
  valorDeVariableBioimpedancia,
  type ObjetivoBioimpedancia,
  type VariableBioimpedancia,
} from "@/dominio/entidades/ObjetivoBioimpedancia";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import {
  proyectarMeta,
  type ProyeccionMeta,
  type PuntoSerie,
} from "@/dominio/servicios/proyeccionComposicion";

/** Valor que hoy tiene una variable, según la última medición. */
export interface ValorActualBioimpedancia {
  variable: VariableBioimpedancia;
  valor: number;
}

/** Todo el seguimiento de bioimpedancia de un paciente. */
export interface SeguimientoBioimpedancia {
  /** De la más vieja a la más nueva. */
  mediciones: Bioimpedancia[];
  objetivos: {
    objetivo: ObjetivoBioimpedancia;
    proyeccion: ProyeccionMeta<VariableBioimpedancia>;
  }[];
  /** Punto de partida para plantear metas nuevas. */
  valoresActuales: ValorActualBioimpedancia[];
}

/**
 * Caso de uso: leer la serie de bioimpedancia de un paciente y proyectar sus
 * metas contra ella. Es la única fuente de la pestaña Bioimpedancia.
 *
 * La proyección es la misma que la de la antropometría (`proyectarMeta`): el
 * progreso se mide desde que la meta existe y el estado, contra la última
 * medición.
 */
export class ObtenerSeguimientoBioimpedancia {
  constructor(
    private readonly bioimpedancias: IBioimpedanciaRepositorio,
    private readonly objetivos: IObjetivoBioimpedanciaRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(
    pacienteId: string,
    ahora: Date = new Date(),
  ): Promise<SeguimientoBioimpedancia> {
    const paciente = await this.pacientes.obtenerPorId(pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(pacienteId);
    }

    const [mediciones, objetivos] = await Promise.all([
      this.bioimpedancias.listarPorPaciente(pacienteId),
      this.objetivos.listarPorPaciente(pacienteId),
    ]);
    const ordenadas = mediciones
      .slice()
      .sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

    return {
      mediciones: ordenadas,
      valoresActuales: valoresDeLaUltima(ordenadas),
      objetivos: objetivos.map((objetivo) => ({
        objetivo,
        proyeccion: proyectarMeta(
          {
            variable: objetivo.variable,
            valorObjetivo: objetivo.valorObjetivo,
            fechaObjetivo: objetivo.fechaObjetivo,
            creadoEn: objetivo.aPrimitivos().creadoEn,
          },
          definicionVariableBioimpedancia(objetivo.variable),
          serieDeVariable(ordenadas, objetivo.variable),
          ahora,
        ),
      })),
    };
  }
}

/** Las consultas que no trajeron la variable quedan fuera de la serie. */
function serieDeVariable(
  mediciones: readonly Bioimpedancia[],
  variable: VariableBioimpedancia,
): PuntoSerie[] {
  const puntos: PuntoSerie[] = [];
  for (const medicion of mediciones) {
    const valor = valorDeVariableBioimpedancia(variable, medicion.medidas);
    if (valor != null) puntos.push({ fecha: medicion.fecha, valor });
  }
  return puntos;
}

function valoresDeLaUltima(
  mediciones: readonly Bioimpedancia[],
): ValorActualBioimpedancia[] {
  const ultima = mediciones[mediciones.length - 1];
  if (!ultima) return [];
  const valores: ValorActualBioimpedancia[] = [];
  for (const variable of VARIABLES_BIOIMPEDANCIA) {
    const valor = valorDeVariableBioimpedancia(variable, ultima.medidas);
    if (valor != null) valores.push({ variable, valor });
  }
  return valores;
}
