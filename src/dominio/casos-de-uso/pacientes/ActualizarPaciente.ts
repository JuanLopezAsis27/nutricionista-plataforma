import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import type { IUsuarioRepositorio } from "../../repositorios/IUsuarioRepositorio";
import type { IConfiguracionRepositorio } from "../../repositorios/IConfiguracionRepositorio";
import { Paciente, type DatosNuevoPaciente } from "../../entidades/Paciente";
import { PREFIJO_PAIS_POR_DEFECTO } from "../../servicios/telefono";
import { ErrorPacienteNoEncontrado } from "../../errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "../../errores/ErrorValidacion";

/** Entrada del dominio: id + cambios parciales a aplicar. */
export interface DatosActualizarPaciente extends Partial<DatosNuevoPaciente> {
  id: string;
}

/**
 * Caso de uso: actualizar los datos de un paciente.
 *
 * Verifica que el paciente exista; si cambia el email, verifica que no lo use
 * otro paciente ni otro usuario, y sincroniza el email en la cuenta de acceso
 * del paciente (para que siga pudiendo iniciar sesión).
 */
export class ActualizarPaciente {
  constructor(
    private readonly repositorio: IPacienteRepositorio,
    private readonly usuarios: IUsuarioRepositorio,
    private readonly configuracion: IConfiguracionRepositorio,
  ) {}

  async ejecutar(datos: DatosActualizarPaciente): Promise<Paciente> {
    const { id, ...cambios } = datos;

    const existente = await this.repositorio.obtenerPorId(id);
    if (!existente) {
      throw new ErrorPacienteNoEncontrado(id);
    }

    const emailNuevo = cambios.email?.trim().toLowerCase();
    const cambiaEmail = Boolean(emailNuevo && emailNuevo !== existente.email);

    if (cambiaEmail) {
      const conMismoEmail = await this.repositorio.obtenerPorEmail(emailNuevo!);
      if (conMismoEmail && conMismoEmail.id !== id) {
        throw new ErrorValidacion("Ya existe otro paciente con ese email.");
      }
      const usuarioConEmail = await this.usuarios.obtenerPorEmail(emailNuevo!);
      if (usuarioConEmail && usuarioConEmail.pacienteId !== id) {
        throw new ErrorValidacion("Ya existe otro usuario con ese email.");
      }
    }

    const config = await this.configuracion.obtener();
    const actualizado = existente.actualizar(
      cambios,
      new Date(),
      config?.whatsappPrefijoPais ?? PREFIJO_PAIS_POR_DEFECTO,
    );
    const guardado = await this.repositorio.actualizar(actualizado);

    // Sincroniza el email en la cuenta de acceso del paciente.
    if (cambiaEmail) {
      const usuario = await this.usuarios.obtenerPorPacienteId(id);
      if (usuario) {
        await this.usuarios.actualizar(usuario.cambiarEmail(guardado.email));
      }
    }

    return guardado;
  }
}
