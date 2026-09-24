import { randomInt } from "node:crypto";
import type { IGeneradorContrasenas } from "@/dominio/servicios/IGeneradorContrasenas";

/**
 * Letras y dígitos sin los que se confunden al leerlos de un email: 0/O/o,
 * 1/l/I. El paciente la va a tipear a mano en el teléfono.
 */
const ALFABETO = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * 12 caracteres de un alfabeto de 56: ~70 bits de entropía, muy por encima
 * del mínimo de la política (8 caracteres) y todavía corta para tipear.
 */
const LARGO = 12;

/**
 * Implementación con `node:crypto`. `randomInt` usa el generador seguro del
 * sistema y no tiene el sesgo de hacer `byte % alfabeto.length`.
 */
export class GeneradorContrasenasCrypto implements IGeneradorContrasenas {
  generar(): string {
    let contrasena = "";
    for (let i = 0; i < LARGO; i++) {
      contrasena += ALFABETO[randomInt(ALFABETO.length)];
    }
    return contrasena;
  }
}
