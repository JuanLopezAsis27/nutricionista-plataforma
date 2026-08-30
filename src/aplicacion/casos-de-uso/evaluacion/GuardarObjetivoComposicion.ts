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
 * Hay una sola meta vigente por paciente y variable: si ya existía, se
 * actualiza en lugar de crear una segunda. Así el dashboard nunca tiene que
 * elegir entre dos objetivos contradictorios para la misma variable.
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
