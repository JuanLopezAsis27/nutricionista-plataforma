/**
 * Puerto de dominio para hashear y verificar contraseñas.
 *
 * El dominio no conoce bcrypt (ni ninguna librería): depende de esta interfaz.
 * La implementación concreta (BcryptHasheador) vive en infraestructura y se
 * inyecta por constructor en los casos de uso que la necesitan (DIP).
 */
export interface IHasheadorContrasena {
  hashear(contrasenaPlana: string): Promise<string>;
  verificar(contrasenaPlana: string, hash: string): Promise<boolean>;
  /**
   * ¿El hash quedó con un costo menor al actual? Solo el login puede migrarlo:
   * es el único momento en que existe la contraseña en claro.
   */
  necesitaRehash(hash: string): boolean;
}
