/**
 * Contrato de persistencia del inquilino (el consultorio de un nutricionista).
 *
 * Existe porque `nutricionistaId` pasó a ser una clave foránea real: la fila
 * del inquilino tiene que existir ANTES que el usuario que lo representa y que
 * cualquier dato suyo. Antes no hacía falta porque la columna era un texto
 * suelto con default vacío, y por eso un inquilino podía "existir" sin que
 * nadie lo hubiera creado.
 *
 * Desde la migración 74 guarda además el NOMBRE del profesional, que es
 * identidad del inquilino: se escribe en el mismo alta y nunca falta.
 */
export interface INutricionistaRepositorio {
  /** Alta idempotente del inquilino: repetirla no falla ni pisa el nombre. */
  crear(id: string, nombre: string): Promise<void>;
  existe(id: string): Promise<boolean>;
  /**
   * El nombre de un consultorio DADO, sin depender del alcance en curso. Es
   * para los flujos que corren con alcance global y saben de quién se trata
   * (la recuperación de contraseña, "Mi perfil").
   */
  nombreDe(id: string): Promise<string | null>;
  /**
   * El nombre del consultorio del alcance en curso: el que usan los
   * recordatorios, los emails y el chat, que corren dentro de un inquilino y
   * no tienen su id a mano. Lanza si no hay un inquilino fijado.
   */
  nombreDelActual(): Promise<string>;
  /** Cambia el nombre del consultorio del alcance en curso. */
  renombrarActual(nombre: string): Promise<void>;
}
