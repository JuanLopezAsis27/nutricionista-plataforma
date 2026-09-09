import bcrypt from "bcryptjs";
import type { IHasheadorContrasena } from "@/dominio/servicios/IHasheadorContrasena";

/**
 * Costo de bcrypt (factor de trabajo). Cada punto DUPLICA el tiempo de cálculo.
 *
 * Estaba en 10, que es el default histórico de la librería y hoy queda por
 * debajo de lo recomendado frente a placas de video: un atacante con la base
 * filtrada prueba contraseñas mucho más rápido de lo que conviene. Se sube a 12.
 *
 * El costo en la aplicación es acotado y vale la pena medirlo bien: bcrypt solo
 * corre al INICIAR SESIÓN y al cambiar la contraseña, no en cada request. Con la
 * sesión durando 12 h (ver auth.config.ts), una persona paga esos ~300-500 ms
 * una vez por jornada. Ninguna pantalla de la app se vuelve más lenta.
 *
 * Se deja configurable por si el VPS resulta más lento de lo previsto y hay que
 * bajarlo sin tocar código. Se acota a un rango sano: por debajo de 10 no tiene
 * sentido, y por encima de 15 el login empieza a sentirse roto.
 */
export const RONDAS_BCRYPT = (() => {
  const configurado = Number(process.env.BCRYPT_ROUNDS);
  if (Number.isInteger(configurado) && configurado >= 10 && configurado <= 15) {
    return configurado;
  }
  return 12;
})();

/**
 * ¿Este hash quedó guardado con un costo menor al actual?
 *
 * Los hashes de bcrypt llevan su propio costo adentro, con la forma
 * `$2a$10$…` — el número entre el segundo y el tercer `$`. Eso permite subir el
 * costo sin invalidar las contraseñas existentes: se detecta el hash viejo y se
 * regraba en el próximo login exitoso (ver auth.ts).
 *
 * Ante cualquier formato que no se reconozca devuelve `false`: mejor no tocar
 * un hash que no se entiende que arriesgar dejar a alguien sin poder entrar.
 */
export function necesitaRehash(hash: string): boolean {
  const partes = hash.split("$");
  if (partes.length < 4) return false;
  const costo = Number(partes[2]);
  return Number.isInteger(costo) && costo < RONDAS_BCRYPT;
}

/**
 * Implementación con bcrypt del puerto de hasheo de contraseñas.
 * Es el único lugar (junto a Auth.js) donde se usa bcrypt.
 */
export class BcryptHasheador implements IHasheadorContrasena {
  constructor(private readonly rondas = RONDAS_BCRYPT) {}

  hashear(contrasenaPlana: string): Promise<string> {
    return bcrypt.hash(contrasenaPlana, this.rondas);
  }

  verificar(contrasenaPlana: string, hash: string): Promise<boolean> {
    return bcrypt.compare(contrasenaPlana, hash);
  }
}
