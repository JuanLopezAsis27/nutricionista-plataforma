import type { IPerfilDeportivoRepositorio } from "@/dominio/repositorios/IPerfilDeportivoRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IDeporteRepositorio } from "@/dominio/repositorios/IDeporteRepositorio";
import {
  PerfilDeportivo,
  type DatosPerfilDeportivo,
} from "@/dominio/entidades/PerfilDeportivo";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

/** Lo que manda la pantalla: el deporte por id, elegido de la lista. */
export type DatosGuardarPerfilDeportivo = Omit<
  DatosPerfilDeportivo,
  "deporte"
> & { deporteId: string };

/**
 * Caso de uso: crear o actualizar el perfil deportivo de un paciente.
 * Uno por paciente: si ya existe, conserva su id y su creadoEn.
 *
 * El deporte tiene que ser de la lista de la plataforma (migración 97): se
 * busca por id antes de escribir, para dar un mensaje y no un choque contra
 * la FK.
 */
export class GuardarPerfilDeportivo {
  constructor(
    private readonly perfiles: IPerfilDeportivoRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly deportes: IDeporteRepositorio,
  ) {}

  async ejecutar(datos: DatosGuardarPerfilDeportivo): Promise<PerfilDeportivo> {
    const paciente = await this.pacientes.obtenerPorId(datos.pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(datos.pacienteId);
    }
    const deporte = await this.deportes.obtenerPorId(datos.deporteId);
    if (!deporte) {
      throw new ErrorValidacion(
        "El deporte elegido ya no está en la lista. Elegí otro.",
      );
    }

    const completos: DatosPerfilDeportivo = {
      ...datos,
      deporte: deporte.referencia,
    };
    const existente = await this.perfiles.obtenerPorPaciente(datos.pacienteId);
    const perfil = existente
      ? existente.actualizar(completos)
      : PerfilDeportivo.crear(completos, crypto.randomUUID());
    return this.perfiles.guardar(perfil);
  }
}
