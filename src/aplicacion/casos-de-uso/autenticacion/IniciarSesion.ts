import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IHasheadorContrasena } from "@/dominio/servicios/IHasheadorContrasena";
import type { ILimitadorIntentos } from "@/dominio/servicios/ILimitadorIntentos";
import type { Usuario } from "@/dominio/entidades/Usuario";
import { esIdentificadorEmail } from "@/dominio/servicios/nombreUsuario";

/** Entrada del login con contraseña. */
export interface EntradaIniciarSesion {
  /** Email o nombre de usuario, tal como lo escribió la persona. */
  identificador: string;
  password: string;
  /** IP de origen, para el límite de intentos. */
  ip: string;
}

/**
 * Cómo terminó el intento.
 *
 * Son cuatro y no dos a propósito, pero de afuera se distinguen solo tres:
 * «esa cuenta no existe» y «contraseña incorrecta» son el MISMO `RECHAZADO`,
 * porque distinguirlos convierte el login en un enumerador de cuentas. El
 * bloqueo sí se dice (no mira ninguna cuenta) y la cuenta desactivada también,
 * pero recién DESPUÉS de verificar la contraseña: solo se lo cuenta a quien ya
 * probó que es la persona.
 */
export type ResultadoIniciarSesion =
  | { tipo: "CORRECTO"; usuario: Usuario }
  | { tipo: "RECHAZADO" }
  | { tipo: "BLOQUEADO" }
  | { tipo: "INACTIVA" };

/**
 * Caso de uso: verificar las credenciales del login.
 *
 * Estuvo escrito adentro del `authorize` de Auth.js, que es presentación, y
 * por eso no lo cubría ningún test: justo las reglas que más importa no
 * romper (no enumerar cuentas, el orden del bloqueo y de la baja) no las
 * verificaba nada. Auth.js ahora solo traduce el resultado.
 *
 * No abre la sesión persistente ni resuelve el consultorio: eso es lo que
 * pasa DESPUÉS de un login correcto, y lo sigue haciendo quien lo llama.
 */
export class IniciarSesion {
  constructor(
    private readonly usuarios: IUsuarioRepositorio,
    private readonly hasheador: IHasheadorContrasena,
    private readonly limitador: ILimitadorIntentos,
  ) {}

  async ejecutar(
    entrada: EntradaIniciarSesion,
  ): Promise<ResultadoIniciarSesion> {
    const identificador = entrada.identificador.trim().toLowerCase();
    const claveIp = `ip:${entrada.ip}`;
    // Por lo que se escribió, sea email o usuario: el bloqueo es por cuenta
    // intentada, exista o no.
    const claveCuenta = `cuenta:${identificador}`;

    // Se rechaza sin buscar la cuenta ni correr bcrypt: además de frenar la
    // fuerza bruta, evita que el costo de bcrypt sea un vector de DoS.
    if (
      this.limitador.estaBloqueada(claveIp).bloqueada ||
      this.limitador.estaBloqueada(claveCuenta).bloqueada
    ) {
      return { tipo: "BLOQUEADO" };
    }

    const fallo = (): void => {
      this.limitador.registrarFallo(claveIp);
      this.limitador.registrarFallo(claveCuenta);
    };

    // Con arroba es un email; sin, un nombre de usuario (que no puede tenerla).
    const usuario = esIdentificadorEmail(identificador)
      ? await this.usuarios.obtenerPorEmail(identificador)
      : await this.usuarios.obtenerPorNombreUsuario(identificador);
    if (!usuario) {
      fallo();
      return { tipo: "RECHAZADO" };
    }

    if (
      !(await this.hasheador.verificar(entrada.password, usuario.passwordHash))
    ) {
      fallo();
      return { tipo: "RECHAZADO" };
    }

    // La baja se informa recién ACÁ, con la contraseña ya verificada: decirla
    // antes le confirmaría a un desconocido que la cuenta existe.
    if (!usuario.activo) {
      fallo();
      return { tipo: "INACTIVA" };
    }

    this.limitador.registrarExito(claveIp);
    this.limitador.registrarExito(claveCuenta);

    return {
      tipo: "CORRECTO",
      usuario: await this.rehashearSiHaceFalta(usuario, entrada.password),
    };
  }

  /**
   * Re-hasheo transparente: si la contraseña quedó guardada con un costo menor
   * al actual, se regraba. Es el único momento en que existe en claro. Si
   * falla, el login igual es correcto: el hash viejo sigue sirviendo y se
   * reintenta en el próximo.
   */
  private async rehashearSiHaceFalta(
    usuario: Usuario,
    password: string,
  ): Promise<Usuario> {
    if (!this.hasheador.necesitaRehash(usuario.passwordHash)) return usuario;
    try {
      // La misma contraseña con otro costo: no deja de ser provisional.
      return await this.usuarios.actualizar(
        usuario.rehashearPassword(await this.hasheador.hashear(password)),
      );
    } catch {
      return usuario;
    }
  }
}
