import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { Paciente } from "@/dominio/entidades/Paciente";
import { ConfiguracionConsultorio } from "@/dominio/entidades/ConfiguracionConsultorio";
import { EnviarEmailDeBienvenida } from "./EnviarEmailDeBienvenida";

/**
 * Caso de uso: el envío AUTOMÁTICO de la bienvenida al dar de alta un
 * paciente. Antes de mandar nada, respeta el interruptor del consultorio
 * (`bienvenidaAutomaticaActiva`): apagado, no manda y no queda registrado
 * ningún envío. El envío manual desde el listado (`EnviarBienvenidaMasiva`)
 * no pasa por este interruptor a propósito: es la vía para mandarla igual.
 */
export class EnviarBienvenidaAlAlta {
  constructor(
    private readonly configuracion: IConfiguracionRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly enviarUno: EnviarEmailDeBienvenida,
  ) {}

  async ejecutar(datos: {
    paciente: Paciente;
    contrasena: string;
  }): Promise<void> {
    const config =
      (await this.configuracion.obtener()) ??
      ConfiguracionConsultorio.porDefecto();
    if (!config.bienvenidaAutomaticaActiva) return;

    const enviado = await this.enviarUno.ejecutar({
      nombrePaciente: datos.paciente.nombreCompleto,
      email: datos.paciente.email,
      contrasena: datos.contrasena,
    });
    if (enviado) {
      await this.pacientes.actualizar(
        datos.paciente.marcarBienvenidaEnviada(new Date()),
      );
    }
  }
}
