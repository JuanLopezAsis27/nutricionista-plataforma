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
 * El email de la ficha es de CONTACTO (migración 79): se puede repetir entre
 * fichas —hermanos con el de la madre— y se puede borrar. Con qué se entra al
 * portal es de la cuenta.
 *
 * Aun así, si la cuenta entraba con ESTE mismo email, cambiarlo en la ficha le
 * cambia también el de ingreso: casi siempre es la corrección de un email mal
 * escrito, y dejarlos distintos sería sorprender a la persona en el login. Eso
 * solo pasa si:
 *
 * - la cuenta es EXCLUSIVA de este consultorio. Si la persona se atiende
 *   también en otro, su email de ingreso es de ella y no de esta ficha:
 *   cambiarlo desde acá le cambiaría el login en los dos lados;
 * - el email nuevo no es ya el de otra cuenta (el de ingreso es único en la
 *   plataforma). Si lo es, cambia solo el de contacto;
 * - el email nuevo no está vacío. Borrarlo de la ficha no le quita a la cuenta
 *   con qué entrar.
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

    const emailNuevo =
      cambios.email === undefined
        ? existente.email
        : cambios.email?.trim().toLowerCase() || null;
    const cuentaASincronizar =
      emailNuevo && existente.email && emailNuevo !== existente.email
        ? await this.cuentaQueEntraCon(id, existente.email, emailNuevo)
        : null;

    const config = await this.configuracion.obtener();
    const actualizado = existente.actualizar(
      cambios,
      new Date(),
      config?.whatsappPrefijoPais ?? PREFIJO_PAIS_POR_DEFECTO,
    );
    const guardado = await this.repositorio.actualizar(actualizado, esperadoEn);

    if (cuentaASincronizar && guardado.email) {
      await this.usuarios.actualizar(
        cuentaASincronizar.cambiarEmail(guardado.email),
      );
    }

    return guardado;
  }

  /**
   * La cuenta de la ficha, si hay que llevarle el email nuevo (ver la clase).
   * Se pregunta ANTES de guardar la ficha para no dejar una a medias.
   */
  private async cuentaQueEntraCon(
    pacienteId: string,
    emailAnterior: string,
    emailNuevo: string,
  ): Promise<Usuario | null> {
    const cuenta = await this.usuarios.obtenerPorPacienteId(pacienteId);
    if (!cuenta || cuenta.email !== emailAnterior) return null;
    if (!esCuentaExclusiva(await this.cuentas.contarDeUsuario(cuenta.id))) {
      return null;
    }
    if (await this.usuarios.emailYaRegistrado(emailNuevo)) return null;
    return cuenta;
  }
}
