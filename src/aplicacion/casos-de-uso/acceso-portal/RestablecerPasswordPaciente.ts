import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { ICuentaPacienteRepositorio } from "@/dominio/repositorios/ICuentaPacienteRepositorio";
import type { ITokenRefrescoRepositorio } from "@/dominio/repositorios/ITokenRefrescoRepositorio";
import type { IHasheadorContrasena } from "@/dominio/servicios/IHasheadorContrasena";
import type { IGeneradorContrasenas } from "@/dominio/servicios/IGeneradorContrasenas";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { esCuentaExclusiva } from "@/dominio/servicios/cuentaPaciente";

/** Credenciales nuevas, para mostrarlas UNA vez y entregarlas en mano. */
export interface CredencialesPortal {
  /** Con qué entra: email o usuario. */
  identificador: string;
  contrasena: string;
}

/**
 * Caso de uso: el profesional le pone una contraseña nueva a la cuenta de un
 * paciente, sin pasar por el email.
 *
 * Existe por las cuentas SIN email (migración 80): «olvidé mi contraseña» no
 * tiene a dónde mandarles el enlace, así que la restablece su profesional y se
 * la da en la consulta. Sirve igual para las que tienen email.
 *
 * Solo en una cuenta EXCLUSIVA de este consultorio: en una compartida, la
 * contraseña abre también la ficha del otro (ver `cuentaPaciente.ts`). Queda
 * provisional y cierra las sesiones persistentes, como cualquier cambio.
 */
export class RestablecerPasswordPaciente {
  constructor(
    private readonly usuarios: IUsuarioRepositorio,
    private readonly cuentas: ICuentaPacienteRepositorio,
    private readonly hasheador: IHasheadorContrasena,
    private readonly generador: IGeneradorContrasenas,
    private readonly tokensRefresco: ITokenRefrescoRepositorio,
    private readonly reloj: IRelojFecha,
  ) {}

  async ejecutar(datos: {
    pacienteId: string;
    /** La que escribió el profesional; sin indicar, se genera una al azar. */
    contrasena?: string | null;
  }): Promise<CredencialesPortal> {
    const cuenta = await this.usuarios.obtenerPorPacienteId(datos.pacienteId);
    if (!cuenta) {
      throw new ErrorValidacion("El paciente no tiene cuenta del portal.");
    }
    if (!esCuentaExclusiva(await this.cuentas.contarDeUsuario(cuenta.id))) {
      throw new ErrorValidacion(
        "La cuenta la comparte con otro consultorio: la contraseña es de la persona y solo la puede cambiar ella.",
      );
    }
    const contrasena = datos.contrasena ?? this.generador.generar();
    await this.usuarios.actualizar(
      cuenta.fijarPasswordProvisional(await this.hasheador.hashear(contrasena)),
    );
    await this.tokensRefresco.revocarDeUsuario(cuenta.id, this.reloj.ahora());
    return { identificador: cuenta.identificador, contrasena };
  }
}
