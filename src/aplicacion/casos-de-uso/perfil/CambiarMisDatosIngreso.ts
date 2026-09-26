import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IHasheadorContrasena } from "@/dominio/servicios/IHasheadorContrasena";
import { ErrorUsuarioNoEncontrado } from "@/dominio/errores/ErrorUsuarioNoEncontrado";
import { ErrorPasswordIncorrecta } from "@/dominio/errores/ErrorPasswordIncorrecta";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { normalizarNombreUsuario } from "@/dominio/servicios/nombreUsuario";

/** Entrada del caso de uso. */
export interface EntradaCambiarMisDatosIngreso {
  usuarioId: string;
  passwordActual: string;
  /** Null (o vacío) = sin email. */
  email: string | null;
  /** Null (o vacío) = sin nombre de usuario. */
  nombreUsuario: string | null;
}

/**
 * Caso de uso: la persona cambia CON QUÉ ENTRA a su cuenta —su email y su
 * nombre de usuario— desde «Mi perfil» (migración 80).
 *
 * Es sobre todo para el paciente que entraba solo con usuario (un chico, una
 * persona mayor) y ahora quiere agregar un email, que es lo que le da «olvidé
 * mi contraseña». También sirve para cambiar uno que ya tenía.
 *
 * Lo puede hacer AUNQUE la cuenta sea compartida entre consultorios: la cuenta
 * es de la persona. Lo que no puede hacer un consultorio (fijarle el email de
 * ingreso a una cuenta compartida) sí lo puede hacer ella.
 *
 * Pide la contraseña actual por el mismo motivo que `CambiarPassword`: una
 * sesión ajena dejada abierta no puede alcanzar para cambiarle el email a la
 * persona y quedarse con la recuperación de su cuenta.
 *
 * El email nuevo no se verifica con un enlace: lo escribe la dueña de la
 * cuenta, que acaba de probar su contraseña. Si lo escribe mal, sigue entrando
 * con lo que tenía y lo puede corregir.
 */
export class CambiarMisDatosIngreso {
  constructor(
    private readonly usuarios: IUsuarioRepositorio,
    private readonly hasheador: IHasheadorContrasena,
  ) {}

  async ejecutar(entrada: EntradaCambiarMisDatosIngreso): Promise<void> {
    const usuario = await this.usuarios.obtenerPorId(entrada.usuarioId);
    if (!usuario) throw new ErrorUsuarioNoEncontrado(entrada.usuarioId);

    if (
      !(await this.hasheador.verificar(
        entrada.passwordActual,
        usuario.passwordHash,
      ))
    ) {
      throw new ErrorPasswordIncorrecta();
    }

    const email = entrada.email?.trim().toLowerCase() || null;
    const nombreUsuario = entrada.nombreUsuario
      ? normalizarNombreUsuario(entrada.nombreUsuario) || null
      : null;

    // Únicos en toda la plataforma. Se pregunta antes de escribir para decir
    // cuál está tomado; el índice único es la red de abajo.
    if (
      email &&
      email !== usuario.email &&
      (await this.usuarios.emailYaRegistrado(email))
    ) {
      throw new ErrorValidacion("Ese email ya lo usa otra cuenta. Elegí otro.");
    }
    if (
      nombreUsuario &&
      nombreUsuario !== usuario.nombreUsuario &&
      (await this.usuarios.nombreUsuarioYaRegistrado(nombreUsuario))
    ) {
      throw new ErrorValidacion(
        `El nombre de usuario «${nombreUsuario}» ya está en uso. Elegí otro.`,
      );
    }

    await this.usuarios.actualizar(
      usuario.cambiarIngreso(email, nombreUsuario),
    );
  }
}
