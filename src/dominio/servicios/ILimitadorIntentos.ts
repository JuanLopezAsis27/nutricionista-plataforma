/**
 * Puerto de dominio para frenar la fuerza bruta: cuenta fallos por clave (una
 * IP, una cuenta intentada) y bloquea la que se pase del límite.
 *
 * La implementación (`LimitadorIntentos`, en memoria) vive en infraestructura.
 */
export interface ILimitadorIntentos {
  estaBloqueada(clave: string): { bloqueada: boolean };
  registrarFallo(clave: string): unknown;
  registrarExito(clave: string): void;
}
