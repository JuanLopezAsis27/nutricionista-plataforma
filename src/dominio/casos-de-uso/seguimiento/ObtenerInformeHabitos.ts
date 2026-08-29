import type { IRegistroDiarioRepositorio } from "../../repositorios/IRegistroDiarioRepositorio";
import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import type { CalidadSueno } from "../../entidades/RegistroDiario";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";

/** Resumen de hábitos del rango pedido (a partir del diario). */
export interface InformeHabitos {
  diasEnRango: number;
  diasConRegistro: number;
  aguaPromedioMl: number | null;
  horasSuenoPromedio: number | null;
  calidadSueno: Record<CalidadSueno, number>;
  diasConActividad: number;
  minutosActividadTotal: number;
  comidasRegistradas: number;
}

const DIA_MS = 24 * 60 * 60 * 1000;

/** Caso de uso: informe de hábitos (agua, sueño, actividad) por rango. */
export class ObtenerInformeHabitos {
  constructor(
    private readonly registros: IRegistroDiarioRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(
    pacienteId: string,
    desde: Date,
    hasta: Date,
  ): Promise<InformeHabitos> {
    const paciente = await this.pacientes.obtenerPorId(pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(pacienteId);
    }

    const dias = await this.registros.listarPorRango(pacienteId, desde, hasta);

    const conAgua: number[] = [];
    const conSueno: number[] = [];
    const calidadSueno: Record<CalidadSueno, number> = {
      MALA: 0,
      REGULAR: 0,
      BUENA: 0,
    };
    let diasConActividad = 0;
    let minutosActividadTotal = 0;
    let comidasRegistradas = 0;

    for (const dia of dias) {
      const datos = dia.aPrimitivos();
      if (datos.aguaMl != null) conAgua.push(datos.aguaMl);
      if (datos.horasSueno != null) conSueno.push(datos.horasSueno);
      if (datos.calidadSueno) calidadSueno[datos.calidadSueno] += 1;
      if (datos.actividades.length > 0) diasConActividad += 1;
      minutosActividadTotal += datos.actividades.reduce(
        (total, actividad) => total + actividad.duracionMinutos,
        0,
      );
      comidasRegistradas += datos.comidas.length;
    }

    const promedio = (valores: number[]): number | null =>
      valores.length === 0
        ? null
        : Math.round(
            (valores.reduce((a, b) => a + b, 0) / valores.length) * 10,
          ) / 10;

    return {
      diasEnRango: Math.round((hasta.getTime() - desde.getTime()) / DIA_MS) + 1,
      diasConRegistro: dias.length,
      aguaPromedioMl: promedio(conAgua),
      horasSuenoPromedio: promedio(conSueno),
      calidadSueno,
      diasConActividad,
      minutosActividadTotal,
      comidasRegistradas,
    };
  }
}
