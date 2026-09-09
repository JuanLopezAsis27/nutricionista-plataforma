/**
 * Contrato de persistencia del inquilino (el consultorio de un nutricionista).
 *
 * Existe porque `nutricionistaId` pasó a ser una clave foránea real: la fila
 * del inquilino tiene que existir ANTES que el usuario que lo representa y que
 * cualquier dato suyo. Antes no hacía falta porque la columna era un texto
 * suelto con default vacío, y por eso un inquilino podía "existir" sin que
 * nadie lo hubiera creado.
 */
export interface INutricionistaRepositorio {
  /** Alta idempotente del inquilino: repetirla no falla. */
  crear(id: string): Promise<void>;
  existe(id: string): Promise<boolean>;
}
