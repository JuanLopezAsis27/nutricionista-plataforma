import type { IObjetivoComposicionRepositorio } from "@/dominio/repositorios/IObjetivoComposicionRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import {
  ObjetivoComposicion,
  type DatosObjetivoComposicion,
} from "@/dominio/entidades/ObjetivoComposicion";
import type { EstadoObjetivo } from "@/dominio/entidades/Objetivo";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";

/** Meta a guardar; el estado solo viaja cuando se está editando una existente. */
export interface DatosGuardarObjetivoComposicion extends DatosObjetivoComposicion {
  estado?: EstadoObjetivo;
}

/**
 * Caso de uso: plantear (o replantear) la meta de una variable de composición.
 *
 * Hay una sola meta vigente por paciente, variable Y ECUACIÓN: si ya existía
 * esa combinación, se actualiza en lugar de crear una segunda. Así el
 * dashboard nunca tiene que elegir entre dos metas contradictorias para lo
 * mismo, y a la vez el profesional puede seguir el % graso por dos ecuaciones
 * distintas —que son dos formas de medir, no dos versiones de un número—.
 */
export class GuardarObjetivoComposicion {
  constructor(
    private readonly objetivos: IObjetivoComposicionRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(
    datos: DatosGuardarObjetivoComposicion,
  ): Promise<ObjetivoComposicion> {
    const paciente = await this.pacientes.obtenerPorId(datos.pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(datos.pacienteId);
    }

    const existente = await this.objetivos.obtenerPorVariable(
      datos.pacienteId,
      datos.variable,
      datos.metodoGrasa ?? null,
    );

    const objetivo = existente
      ? existente.actualizar({
          metodoGrasa: datos.metodoGrasa ?? null,
          valorObjetivo: datos.valorObjetivo,
          fechaObjetivo: datos.fechaObjetivo ?? null,
          notas: datos.notas ?? null,
          estado: datos.estado,
        })
      : ObjetivoComposicion.crear(datos, crypto.randomUUID());

    return this.objetivos.guardar(objetivo);
  }
}
