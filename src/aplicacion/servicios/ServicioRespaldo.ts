import type {
  ArmarIndiceRespaldo,
  IndiceRespaldo,
} from "@/aplicacion/casos-de-uso/respaldo/ArmarIndiceRespaldo";

/**
 * Servicio de aplicación del respaldo del consultorio: qué va en el ZIP y en
 * qué carpeta. El ZIP en sí (y los PDF y Excel que se generan para cada
 * paciente) lo arma el borde HTTP, que es el que lo transmite.
 */
export class ServicioRespaldo {
  constructor(private readonly armarIndiceUC: ArmarIndiceRespaldo) {}

  async indice(): Promise<IndiceRespaldo> {
    return this.armarIndiceUC.ejecutar();
  }
}
