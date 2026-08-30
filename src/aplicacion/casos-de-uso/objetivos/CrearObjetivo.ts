import type { IObjetivoRepositorio } from "@/dominio/repositorios/IObjetivoRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import {
  Objetivo,
  type DatosNuevoObjetivo,
} from "@/dominio/entidades/Objetivo";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";

/**
 * Caso de uso: crear un objetivo para un paciente.
 * Registra el evento CREACION en el historial (auditoría desde el dominio).
 */
export class CrearObjetivo {
  constructor(
    private readonly objetivos: IObjetivoRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(datos: DatosNuevoObjetivo): Promise<Objetivo> {
    const paciente = await this.pacientes.obtenerPorId(datos.pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(datos.pacienteId);
    }
    const objetivo = Objetivo.crear(datos, crypto.randomUUID());
    return this.objetivos.crear(objetivo, {
      tipo: "CREACION",
      detalle: `Objetivo creado: «${objetivo.titulo}».`,
    });
  }
}
