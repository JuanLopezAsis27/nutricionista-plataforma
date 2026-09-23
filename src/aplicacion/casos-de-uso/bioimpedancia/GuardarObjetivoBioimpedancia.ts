import type { IObjetivoBioimpedanciaRepositorio } from "@/dominio/repositorios/IObjetivoBioimpedanciaRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import {
  ObjetivoBioimpedancia,
  type DatosObjetivoBioimpedancia,
} from "@/dominio/entidades/ObjetivoBioimpedancia";
import type { EstadoObjetivo } from "@/dominio/entidades/Objetivo";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";

/** Meta a guardar; el estado solo viaja cuando se está editando una existente. */
export interface DatosGuardarObjetivoBioimpedancia extends DatosObjetivoBioimpedancia {
  estado?: EstadoObjetivo;
}

/**
 * Caso de uso: plantear (o replantear) la meta de una variable de la
 * bioimpedancia. Una sola vigente por paciente y variable: si ya existía, se
 * actualiza en lugar de crear una segunda que la contradiga.
 */
export class GuardarObjetivoBioimpedancia {
  constructor(
    private readonly objetivos: IObjetivoBioimpedanciaRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(
    datos: DatosGuardarObjetivoBioimpedancia,
  ): Promise<ObjetivoBioimpedancia> {
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
          valorObjetivo: datos.valorObjetivo,
          fechaObjetivo: datos.fechaObjetivo ?? null,
          notas: datos.notas ?? null,
          estado: datos.estado,
        })
      : ObjetivoBioimpedancia.crear(datos, crypto.randomUUID());

    return this.objetivos.guardar(objetivo);
  }
}
