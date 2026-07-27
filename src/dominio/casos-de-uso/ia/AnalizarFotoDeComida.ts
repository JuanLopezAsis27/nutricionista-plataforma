import type { IHistorialIARepositorio } from "../../repositorios/IHistorialIARepositorio";
import type {
  IAnalisisComidaIA,
  ResultadoAnalisisComida,
} from "../../servicios/IAnalisisComidaIA";
import { AnalisisComida } from "../../entidades/AnalisisComida";

/** Datos para analizar una foto de comida. */
export interface DatosAnalizarComida {
  pacienteId: string;
  archivoId?: string | null;
  archivoClave?: string;
  descripcion?: string;
}

/**
 * Caso de uso: analizar una foto de comida y guardar el resultado. Delega en
 * el puerto de visión (stub hoy, Claude a futuro) y persiste el análisis como
 * historial (señal para el ML).
 */
export class AnalizarFotoDeComida {
  constructor(
    private readonly analizador: IAnalisisComidaIA,
    private readonly historial: IHistorialIARepositorio,
  ) {}

  async ejecutar(datos: DatosAnalizarComida): Promise<ResultadoAnalisisComida> {
    const resultado = await this.analizador.analizar({
      archivoClave: datos.archivoClave,
      descripcion: datos.descripcion,
    });

    await this.historial.guardarAnalisis(
      AnalisisComida.crear(
        { pacienteId: datos.pacienteId, archivoId: datos.archivoId ?? null, resultado },
        crypto.randomUUID(),
      ),
    );

    return resultado;
  }
}
