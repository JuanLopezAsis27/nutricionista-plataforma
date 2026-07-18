import type { IRegistroDiarioRepositorio } from "../../repositorios/IRegistroDiarioRepositorio";
import { ErrorValidacion } from "../../errores/ErrorValidacion";

/** Indicadores de un día del mes para pintar el calendario. */
export interface DiaCalendario {
  fecha: Date;
  tienePeso: boolean;
  tieneAgua: boolean;
  tieneSueno: boolean;
  cantidadComidas: number;
  cantidadActividades: number;
}

/**
 * Caso de uso: resumen mensual del diario — un indicador por día con algo
 * registrado, para la vista calendario del portal.
 */
export class ObtenerCalendarioDiario {
  constructor(private readonly registros: IRegistroDiarioRepositorio) {}

  async ejecutar(pacienteId: string, anio: number, mes: number): Promise<DiaCalendario[]> {
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
      throw new ErrorValidacion("Año fuera de rango.");
    }
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
      throw new ErrorValidacion("El mes debe estar entre 1 y 12.");
    }

    const desde = new Date(Date.UTC(anio, mes - 1, 1));
    const hasta = new Date(Date.UTC(anio, mes, 0)); // último día del mes

    const registros = await this.registros.listarPorRango(pacienteId, desde, hasta);

    return registros.map((registro) => {
      const datos = registro.aPrimitivos();
      return {
        fecha: datos.fecha,
        tienePeso: datos.pesoKg != null,
        tieneAgua: datos.aguaMl != null && datos.aguaMl > 0,
        tieneSueno: datos.horasSueno != null,
        cantidadComidas: datos.comidas.length,
        cantidadActividades: datos.actividades.length,
      };
    });
  }
}
