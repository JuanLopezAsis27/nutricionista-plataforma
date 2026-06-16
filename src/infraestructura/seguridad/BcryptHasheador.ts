import bcrypt from "bcryptjs";
import type { IHasheadorContrasena } from "@/dominio/servicios/IHasheadorContrasena";

/**
 * Implementación con bcrypt del puerto de hasheo de contraseñas.
 * Es el único lugar (junto a Auth.js) donde se usa bcrypt.
 */
export class BcryptHasheador implements IHasheadorContrasena {
  constructor(private readonly rondas = 10) {}

  hashear(contrasenaPlana: string): Promise<string> {
    return bcrypt.hash(contrasenaPlana, this.rondas);
  }

  verificar(contrasenaPlana: string, hash: string): Promise<boolean> {
    return bcrypt.compare(contrasenaPlana, hash);
  }
}
