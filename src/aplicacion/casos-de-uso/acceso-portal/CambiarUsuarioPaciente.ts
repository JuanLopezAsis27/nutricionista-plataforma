import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { ICuentaPacienteRepositorio } from "@/dominio/repositorios/ICuentaPacienteRepositorio";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { esCuentaExclusiva } from "@/dominio/servicios/cuentaPaciente";
import { normalizarNombreUsuario } from "@/dominio/servicios/nombreUsuario";

/**
 * Caso de uso: el profesional le pone, cambia o saca el nombre de usuario a la
 * cuenta de un paciente, desde su ficha (migración 80).
 *
 * Solo en una cuenta EXCLUSIVA de este consultorio, como la contraseña: en una
 * compartida, el usuario es con lo que la persona entra también al otro
 * consultorio, y cambiárselo desde acá la dejaría afuera allá.
 *
 * Sacarlo solo se puede si la cuenta tiene email: sin ninguno de los dos no
 * habría con qué entrar (lo rechaza la entidad).
 */
export class CambiarUsuarioPaciente {
  constructor(
    private readonly usuarios: IUsuarioRepositorio,
    private readonly cuentas: ICuentaPacienteRepositorio,
  ) {}

  async ejecutar(datos: {
    pacienteId: string;
    nombreUsuario: string | null;
  }): Promise<{ identificador: string }> {
    const cuenta = await this.usuarios.obtenerPorPacienteId(datos.pacienteId);
    if (!cuenta) {
      throw new ErrorValidacion("El paciente no tiene cuenta del portal.");
    }
    if (!esCuentaExclusiva(await this.cuentas.contarDeUsuario(cuenta.id))) {
      throw new ErrorValidacion(
        "La cuenta la comparte con otro consultorio: con qué entra es de la persona y solo lo puede cambiar ella, desde «Mi perfil».",
      );
    }

    const nombreUsuario = datos.nombreUsuario
      ? normalizarNombreUsuario(datos.nombreUsuario) || null
      : null;
    if (
      nombreUsuario &&
      nombreUsuario !== cuenta.nombreUsuario &&
      (await this.usuarios.nombreUsuarioYaRegistrado(nombreUsuario))
    ) {
      throw new ErrorValidacion(
        `El nombre de usuario «${nombreUsuario}» ya está en uso. Elegí otro.`,
      );
    }

    const actualizada = await this.usuarios.actualizar(
      cuenta.cambiarIngreso(cuenta.email, nombreUsuario),
    );
    return { identificador: actualizada.identificador };
  }
}
