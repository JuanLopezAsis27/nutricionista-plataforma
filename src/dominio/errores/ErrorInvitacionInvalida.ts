import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/**
 * El código de invitación no existe, venció o ya se usó. El mensaje no dice
 * cuál de las tres, igual que `ErrorTokenInvalido`: distinguirlas le diría a
 * quien prueba códigos cuáles existieron.
 */
export class ErrorInvitacionInvalida extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "VALIDACION";

  constructor() {
    super(
      "El código no es válido o ya venció. Pedile uno nuevo a tu profesional.",
    );
  }
}
