import type { INutricionistaRepositorio } from "@/dominio/repositorios/INutricionistaRepositorio";
import { nombreProfesionalValidado } from "@/dominio/entidades/nombreProfesional";

/**
 * Caso de uso: el profesional cambia el nombre con el que firma.
 *
 * Se puede cambiar pero no vaciar: es el `{{profesional}}` de los
 * recordatorios, la firma de los emails y el membrete del PDF.
 */
export class CambiarNombreProfesional {
  constructor(private readonly nutricionistas: INutricionistaRepositorio) {}

  async ejecutar(nombre: string): Promise<string> {
    const validado = nombreProfesionalValidado(nombre);
    await this.nutricionistas.renombrarActual(validado);
    return validado;
  }
}
