import type { IAntropometriaRepositorio } from "../../repositorios/IAntropometriaRepositorio";
import type { IRegistroDiarioRepositorio } from "../../repositorios/IRegistroDiarioRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";

/** Punto de la serie de progreso (fecha + peso de una u otra fuente). */
export interface PuntoProgreso {
  fecha: Date;
  /** Peso medido en consulta (antropometría). */
  pesoConsulta: number | null;
  /** Peso autoreportado en el diario. */
  pesoDiario: number | null;
}

export interface InformeProgreso {
  puntos: PuntoProgreso[];
  pesoInicial: number | null;
  pesoActual: number | null;
  variacionKg: number | null;
}

/**
 * Caso de uso: informe de progreso de peso, mezclando las mediciones de
 * consulta (antropometría) con el peso autoreportado del diario en una sola
 * serie temporal.
 */
export class ObtenerInformeProgreso {
  constructor(
    private readonly antropometrias: IAntropometriaRepositorio,
    private readonly registros: IRegistroDiarioRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(
    pacienteId: string,
    desde: Date,
    hasta: Date,
  ): Promise<InformeProgreso> {
    const paciente = await this.pacientes.obtenerPorId(pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(pacienteId);
    }

    const [mediciones, diario] = await Promise.all([
      this.antropometrias.listarPorPaciente(pacienteId),
      this.registros.listarPorRango(pacienteId, desde, hasta),
    ]);

    const porFecha = new Map<number, PuntoProgreso>();
    const puntoDe = (fecha: Date): PuntoProgreso => {
      const clave = fecha.getTime();
      let punto = porFecha.get(clave);
      if (!punto) {
        punto = { fecha, pesoConsulta: null, pesoDiario: null };
        porFecha.set(clave, punto);
      }
      return punto;
    };

    for (const medicion of mediciones) {
      if (medicion.fecha < desde || medicion.fecha > hasta) continue;
      puntoDe(medicion.fecha).pesoConsulta = medicion.pesoKg;
    }
    for (const registro of diario) {
      const datos = registro.aPrimitivos();
      if (datos.pesoKg == null) continue;
      puntoDe(datos.fecha).pesoDiario = datos.pesoKg;
    }

    const puntos = [...porFecha.values()].sort(
      (a, b) => a.fecha.getTime() - b.fecha.getTime(),
    );

    const pesos = puntos
      .map((p) => p.pesoConsulta ?? p.pesoDiario)
      .filter((peso): peso is number => peso != null);
    const pesoInicial = pesos[0] ?? null;
    const pesoActual = pesos[pesos.length - 1] ?? null;

    return {
      puntos,
      pesoInicial,
      pesoActual,
      variacionKg:
        pesoInicial != null && pesoActual != null
          ? Math.round((pesoActual - pesoInicial) * 10) / 10
          : null,
    };
  }
}
