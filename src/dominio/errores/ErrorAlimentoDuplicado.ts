import { ErrorDominio, type CodigoErrorDominio } from "./ErrorDominio";

/**
 * Se lanza al dar de alta (o renombrar) un alimento que ya está en la lista:
 * mismo nombre y marca, sin contar mayúsculas, tildes ni espacios de más
 * (`AlimentoPropio.claveIdentidad`).
 *
 * Nombra al que ya existe con SU escritura: si el profesional tipeó «avena»
 * y la lista tiene «Avena», tiene que poder encontrarlo. El mensaje no dice
 * de qué lista es porque sirve igual a la del consultorio y al catálogo de la
 * plataforma (mismos casos de uso, otro repositorio).
 */
export class ErrorAlimentoDuplicado extends ErrorDominio {
  readonly codigo: CodigoErrorDominio = "CONFLICTO";

  constructor(existente: string) {
    super(`«${existente}» ya está en la lista.`);
  }
}
