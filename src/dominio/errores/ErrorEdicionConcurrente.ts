import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/**
 * Se lanza cuando la ficha que se está guardando cambió en la base DESPUÉS de
 * que el cliente la leyera: alguien más la editó mientras tanto.
 *
 * Es el *lost update* clásico, y sin esto no falla nada — que es lo peor que
 * tiene. Dos personas abren la misma ficha, una guarda el teléfono, la otra
 * guarda una nota y el formulario manda TODOS sus campos, incluido el teléfono
 * viejo que tenía en pantalla. El teléfono vuelve atrás, nadie ve un error y el
 * dato perdido solo se descubre si alguien lo va a buscar.
 *
 * El mensaje dice qué hacer, porque el usuario no hizo nada mal: sus cambios
 * no se guardaron y los tiene en pantalla. Recargar y volver a aplicarlos es
 * la única salida honesta — fusionar por nuestra cuenta sería elegir cuál de
 * los dos profesionales tenía razón.
 */
export class ErrorEdicionConcurrente extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "CONFLICTO";

  constructor(queCosa: string) {
    super(
      `${queCosa} fue modificada por otra persona mientras la editabas. ` +
        "Tus cambios NO se guardaron: recargá para ver la versión actual y " +
        "volvé a aplicarlos.",
    );
  }
}
