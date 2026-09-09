import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IHasheadorContrasena } from "@/dominio/servicios/IHasheadorContrasena";
import { ErrorUsuarioNoEncontrado } from "@/dominio/errores/ErrorUsuarioNoEncontrado";
import { ErrorPasswordIncorrecta } from "@/dominio/errores/ErrorPasswordIncorrecta";

/** Entrada del caso de uso. */
export interface EntradaCambiarPassword {
  usuarioId: string;
  passwordActual: string;
  passwordNueva: string;
}

/**
 * Caso de uso: cambiar la propia contraseña estando con la sesión abierta.
 *
 * Es el tercer camino por el que una contraseña puede cambiar, y el único que
 * exige la ANTERIOR. Los otros dos —el restablecimiento por email y el alta de
 * la cuenta— prueban la identidad de otra forma (un token que llegó a la
 * casilla, o que quien crea la cuenta es el profesional).
 *
 * Pedir la actual no es burocracia: sin eso, una sesión ajena dejada abierta en
 * un consultorio alcanza para quedarse con la cuenta, porque el que se sienta
 * frente a la pantalla puede cambiar la contraseña sin conocer ninguna. La
 * confirmación (escribirla dos veces) es otra cosa y se valida en el DTO: no
 * protege contra nadie, evita quedar afuera por un error de tipeo.
 *
 * La FORMA de la contraseña nueva (largo, obvias) la valida `passwordNuevaDto`
 * en el borde; acá se comprueba la identidad y se persiste el hash. El caso de
 * uso no importa DTOs a propósito: es lo que permite invocarlo desde otro
 * adaptador sin arrastrar Zod.
 */
export class CambiarPassword {
  constructor(
    private readonly usuarios: IUsuarioRepositorio,
    private readonly hasheador: IHasheadorContrasena,
  ) {}

  async ejecutar(entrada: EntradaCambiarPassword): Promise<void> {
    const usuario = await this.usuarios.obtenerPorId(entrada.usuarioId);
    if (!usuario) {
      throw new ErrorUsuarioNoEncontrado(entrada.usuarioId);
    }

    const coincide = await this.hasheador.verificar(
      entrada.passwordActual,
      usuario.passwordHash,
    );
    if (!coincide) {
      throw new ErrorPasswordIncorrecta();
    }

    const hash = await this.hasheador.hashear(entrada.passwordNueva);
    await this.usuarios.actualizar(usuario.cambiarPassword(hash));
  }
}
