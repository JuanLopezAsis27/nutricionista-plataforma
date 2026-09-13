import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { ITokenRefrescoRepositorio } from "@/dominio/repositorios/ITokenRefrescoRepositorio";
import type { IGeneradorTokens } from "@/dominio/servicios/IGeneradorTokens";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import type { Usuario } from "@/dominio/entidades/Usuario";
import { ErrorTokenInvalido } from "@/dominio/errores/ErrorTokenInvalido";

/** Entrada del caso de uso. */
export interface EntradaRenovarSesion {
  /** El token en claro que venía en la cookie. */
  token: string;
}

/** Quién es y en qué cadena de rotación sigue. */
export interface SesionRenovada {
  usuario: Usuario;
  /** Familia del token consumido: el nuevo nace en la misma. */
  familia: string;
}

/**
 * Ventana en la que un token ya canjeado se acepta otra vez sin considerarlo
 * robado (30 s).
 *
 * Es el precio de rotar. Dos pestañas abiertas después de un fin de semana —o
 * una navegación con prefetch— presentan la MISMA cookie casi al mismo tiempo:
 * la primera la canjea, la segunda llega con un token que ya figura usado. Sin
 * esta ventana eso se leería como reutilización y echaría al usuario de todos
 * sus dispositivos por haber abierto dos pestañas.
 *
 * La ventana es corta a propósito: un atacante que canjee un token robado tiene
 * que hacerlo dentro de esos 30 s del canje legítimo para pasar inadvertido, y
 * si lo hace más tarde —el caso real, porque el robo se explota cuando se puede
 * y no cuando la víctima está navegando— la detección salta igual.
 *
 * Dentro de la ventana la renovación se CONCEDE (se emite otro token de la
 * misma familia) en vez de rechazarse. Rechazar dejaría a la segunda pestaña en
 * el login mientras la primera anda: el usuario vería la sesión caída en una
 * mitad de la pantalla y viva en la otra.
 */
const GRACIA_REUTILIZACION_MS = 30_000;

/**
 * Caso de uso: canjear un token de refresco por el derecho a una sesión nueva.
 *
 * Es la mitad que VALIDA y CONSUME; la que emite el token siguiente es
 * `EmitirTokenRefresco`, y las une `ServicioAutenticacion.renovarSesion`. Están
 * separadas porque son dos decisiones distintas: esta responde "¿quién es y
 * puede seguir?" y aquella "¿con qué credencial sigue?".
 *
 * Todos los motivos de rechazo salen con el mismo error genérico: quien
 * presenta un token inválido no tiene por qué enterarse de si venció, si ya se
 * usó o si la cuenta está dada de baja.
 *
 * El usuario se revalida contra la base en cada renovación —activo, y con el
 * rol e inquilino del momento—: una cuenta dada de baja no puede resucitar su
 * sesión, y el JWT que se emita después lleva los datos de hoy, no los del
 * login original.
 */
export class RenovarSesion {
  constructor(
    private readonly usuarios: IUsuarioRepositorio,
    private readonly tokens: ITokenRefrescoRepositorio,
    private readonly generador: IGeneradorTokens,
    private readonly reloj: IRelojFecha,
  ) {}

  async ejecutar(entrada: EntradaRenovarSesion): Promise<SesionRenovada> {
    const ahora = this.reloj.ahora();
    const hash = this.generador.hashear(entrada.token);

    const registro = await this.tokens.obtenerPorHash(hash);
    if (!registro) {
      throw new ErrorTokenInvalido();
    }

    const usadoEn = registro.usadoEn;
    const dentroDeGracia =
      usadoEn !== null &&
      ahora.getTime() - usadoEn.getTime() <= GRACIA_REUTILIZACION_MS;

    // Reutilización fuera de la ventana de gracia: se asume robo y cae la
    // familia entera —el ladrón y el dueño—, porque no hay manera de saber
    // cuál de los dos lo presentó.
    if (usadoEn !== null && !dentroDeGracia) {
      await this.tokens.revocarFamilia(registro.familia, ahora);
      throw new ErrorTokenInvalido();
    }

    // Revocado o vencido: no se renueva y no hay nada que revocar.
    if (registro.revocadoEn !== null || registro.expiraEn <= ahora) {
      throw new ErrorTokenInvalido();
    }

    const usuario = await this.usuarios.obtenerPorId(registro.usuarioId);
    if (!usuario || !usuario.activo) {
      // La cuenta ya no existe o está dada de baja: no tiene sentido dejar
      // viva la cadena.
      await this.tokens.revocarFamilia(registro.familia, ahora);
      throw new ErrorTokenInvalido();
    }

    // Consumir: de acá en más, presentarlo otra vez es reutilización. Dentro
    // de la gracia ya está consumido y se deja como está: pisar `usadoEn`
    // correría la ventana hacia adelante en cada reintento y la volvería
    // indefinida.
    if (usadoEn === null) {
      await this.tokens.marcarUsado(registro.id, ahora);
    }

    return { usuario, familia: registro.familia };
  }
}
