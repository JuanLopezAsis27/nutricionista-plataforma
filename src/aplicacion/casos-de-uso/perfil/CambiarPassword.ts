import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { ITokenRefrescoRepositorio } from "@/dominio/repositorios/ITokenRefrescoRepositorio";
import type { IHasheadorContrasena } from "@/dominio/servicios/IHasheadorContrasena";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
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
    private readonly tokensRefresco: ITokenRefrescoRepositorio,
    private readonly reloj: IRelojFecha,
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

    // Cambiar la contraseña cierra las sesiones persistentes de TODOS los
    // dispositivos, este incluido. Dejarlas vivas convertiría el cambio en un
    // trámite decorativo para el caso que más importa —"creo que alguien entró
    // a mi cuenta"—: el token de refresco que ya tenga el otro no depende de la
    // contraseña y le seguiría abriendo la puerta durante semanas.
    //
    // Que el propio dispositivo tenga que volver a entrar es el costo, y es el
    // comportamiento que ya espera cualquiera que cambió una contraseña en otro
    // lado.
    await this.tokensRefresco.revocarDeUsuario(usuario.id, this.reloj.ahora());
  }
}
