import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { ICuentaPacienteRepositorio } from "@/dominio/repositorios/ICuentaPacienteRepositorio";
import { esCuentaExclusiva } from "@/dominio/servicios/cuentaPaciente";
import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import {
  Paciente,
  type DatosNuevoPaciente,
} from "@/dominio/entidades/Paciente";
import { PREFIJO_PAIS_POR_DEFECTO } from "@/dominio/servicios/telefono";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import type { Usuario } from "@/dominio/entidades/Usuario";

/** Entrada del dominio: id + cambios parciales a aplicar. */
export interface DatosActualizarPaciente extends Partial<DatosNuevoPaciente> {
  id: string;
  /**
   * `actualizadoEn` que tenía la ficha cuando se abrió. Va hasta el WHERE del
   * UPDATE: si la fila ya no está en esa versión, la escritura no entra.
   */
  actualizadoEn?: Date;
}

/**
 * Caso de uso: actualizar los datos de un paciente.
 *
 * Verifica que el paciente exista; si cambia el email, verifica que no lo use
 * otro paciente ni otra cuenta, y sincroniza el email en la cuenta de acceso
 * del paciente (para que siga pudiendo iniciar sesión).
 *
 * **Solo si la cuenta es exclusiva de este consultorio.** Si la persona se
 * atiende también en otro, su email de inicio de sesión es de ella y no de
 * esta ficha: cambiarlo desde acá le cambiaría el login en los dos lados. En
 * ese caso cambia el email de la ficha (a dónde le escribe ESTE consultorio) y
 * la cuenta queda como estaba.
 */
export class ActualizarPaciente {
  constructor(
    private readonly repositorio: IPacienteRepositorio,
    private readonly usuarios: IUsuarioRepositorio,
    private readonly cuentas: ICuentaPacienteRepositorio,
    private readonly configuracion: IConfiguracionRepositorio,
  ) {}

  async ejecutar(datos: DatosActualizarPaciente): Promise<Paciente> {
    const { id, actualizadoEn: esperadoEn, ...cambios } = datos;

    const existente = await this.repositorio.obtenerPorId(id);
    if (!existente) {
      throw new ErrorPacienteNoEncontrado(id);
    }

    const emailNuevo = cambios.email?.trim().toLowerCase();
    const cambiaEmail = Boolean(emailNuevo && emailNuevo !== existente.email);

    // La cuenta se sincroniza solo si es de este consultorio y de nadie más.
    let cuentaASincronizar: Usuario | null = null;
    if (cambiaEmail) {
      const conMismoEmail = await this.repositorio.obtenerPorEmail(emailNuevo!);
      if (conMismoEmail && conMismoEmail.id !== id) {
        throw new ErrorValidacion("Ya existe otro paciente con ese email.");
      }
      const cuenta = await this.usuarios.obtenerPorPacienteId(id);
      if (
        cuenta &&
        esCuentaExclusiva(await this.cuentas.contarDeUsuario(cuenta.id))
      ) {
        cuentaASincronizar = cuenta;
        // `usuarios.email` es único en TODA la plataforma: se pregunta ANTES
        // de guardar la ficha. Si no, el choque aparecía recién contra el
        // índice, con la ficha ya guardada y la cuenta con el email viejo.
        if (
          emailNuevo !== cuenta.email &&
          (await this.usuarios.emailYaRegistrado(emailNuevo!))
        ) {
          throw new ErrorValidacion(
            "Ese email ya tiene una cuenta en la plataforma. Usá otro para el inicio de sesión del paciente.",
          );
        }
      }
    }

    const config = await this.configuracion.obtener();
    const actualizado = existente.actualizar(
      cambios,
      new Date(),
      config?.whatsappPrefijoPais ?? PREFIJO_PAIS_POR_DEFECTO,
    );
    const guardado = await this.repositorio.actualizar(actualizado, esperadoEn);

    // Sincroniza el email en la cuenta de acceso del paciente.
    if (cuentaASincronizar && cuentaASincronizar.email !== guardado.email) {
      await this.usuarios.actualizar(
        cuentaASincronizar.cambiarEmail(guardado.email),
      );
    }

    return guardado;
  }
}
