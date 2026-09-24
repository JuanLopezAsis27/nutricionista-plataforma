import type { INutricionistaRepositorio } from "@/dominio/repositorios/INutricionistaRepositorio";

/**
 * Caso de uso: el nombre del profesional del consultorio en curso.
 *
 * Vive en `nutricionistas.nombre` (migración 74) y no en la configuración,
 * pero la pantalla de Configuración y los PDF lo reciben dentro de la misma
 * lectura: el servicio lo suma a la salida.
 */
export class ObtenerNombreProfesional {
  constructor(private readonly nutricionistas: INutricionistaRepositorio) {}

  async ejecutar(): Promise<string> {
    return this.nutricionistas.nombreDelActual();
  }
}
