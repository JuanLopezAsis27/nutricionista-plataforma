import type { ResultadoAnalisisComida } from "../servicios/IAnalisisComidaIA";

/** Datos para registrar un análisis de comida. */
export interface DatosNuevoAnalisisComida {
  pacienteId: string;
  archivoId?: string | null;
  resultado: ResultadoAnalisisComida;
}

/** Estado completo de un análisis persistido. */
export interface PropiedadesAnalisisComida {
  id: string;
  pacienteId: string;
  archivoId: string | null;
  resultado: ResultadoAnalisisComida;
  creadoEn: Date;
}

/**
 * Entidad de dominio AnalisisComida: el resultado (macros estimados) de
 * analizar una foto de comida. Se guarda como historial (señal para el ML).
 */
export class AnalisisComida {
  private constructor(private readonly props: PropiedadesAnalisisComida) {}

  static crear(
    datos: DatosNuevoAnalisisComida,
    id: string,
    ahora: Date = new Date(),
  ): AnalisisComida {
    return new AnalisisComida({
      id,
      pacienteId: datos.pacienteId,
      archivoId: datos.archivoId ?? null,
      resultado: datos.resultado,
      creadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesAnalisisComida): AnalisisComida {
    return new AnalisisComida(props);
  }

  aPrimitivos(): PropiedadesAnalisisComida {
    return { ...this.props };
  }
}
