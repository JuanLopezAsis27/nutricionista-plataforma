import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/**
 * Una restricción de la base frenó la operación: algo repetido, algo que
 * todavía tiene cosas colgando o algo que ya no está.
 *
 * ## Por qué existe
 *
 * Cada una de esas situaciones **debería** haberse comprobado antes, en el caso
 * de uso, con un error propio que diga exactamente qué pasó. Cuando no está
 * comprobada, el choque aparece recién en Postgres, y ahí el error que vuelve
 * no es del dominio: cae en el `catch` final del middleware de tRPC y llega a
 * pantalla como «Ocurrió un error inesperado. Volvé a intentarlo en unos
 * minutos.» — que es mentira dos veces, porque ni es inesperado ni se arregla
 * intentando de nuevo.
 *
 * Esta clase es la RED, no el piso: convierte ese genérico en algo que al menos
 * dice qué tipo de problema hubo y qué se puede hacer. El chequeo explícito en
 * el caso de uso sigue siendo lo correcto, y por eso la traducción también
 * reporta al monitor: que haga falta significa que falta una validación.
 *
 * La traducción desde el error de Prisma vive en infraestructura
 * (`persistencia/erroresPrisma.ts`); el dominio no conoce Prisma.
 */
export class ErrorRestriccionDatos extends ErrorDominio {
  readonly codigo: CodigoErrorDominio;

  constructor(mensaje: string, codigo: CodigoErrorDominio = "CONFLICTO") {
    super(mensaje);
    this.codigo = codigo;
  }
}
