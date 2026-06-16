/**
 * Códigos semánticos de error del dominio.
 * La capa de presentación (tRPC) los traduce a códigos de transporte
 * (p. ej. NOT_FOUND → "NOT_FOUND" de TRPCError) sin que el dominio
 * conozca nada de tRPC.
 */
export type CodigoErrorDominio =
  | "VALIDACION"
  | "NO_ENCONTRADO"
  | "CONFLICTO"
  | "ACCESO_DENEGADO"
  | "NO_AUTENTICADO";

/**
 * Error base del dominio. Todo error de negocio extiende de esta clase,
 * nunca se lanzan strings ni Error genéricos.
 */
export abstract class ErrorDominio extends Error {
  /** Código semántico estable para mapear a la capa de transporte. */
  abstract readonly codigo: CodigoErrorDominio;

  protected constructor(mensaje: string) {
    super(mensaje);
    // Conserva el nombre real de la subclase en el stack trace.
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
