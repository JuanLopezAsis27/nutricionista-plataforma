import type { ImportarAlimentos } from "@/aplicacion/casos-de-uso/nutricion/ImportarAlimentos";
import type { ObtenerEstadoAlimentosPropios } from "@/aplicacion/casos-de-uso/nutricion/ObtenerEstadoAlimentosPropios";
import type { VaciarAlimentosPropios } from "@/aplicacion/casos-de-uso/nutricion/VaciarAlimentosPropios";
import type {
  EstadoAlimentosPropiosDto,
  ImportarAlimentosDto,
} from "../dtos/alimentoPropio.dto";

/**
 * Servicio de aplicación de los alimentos propios del nutricionista. Orquesta la
 * importación (reemplaza la lista), el estado (para la UI) y el vaciado.
 */
export class ServicioAlimentosPropios {
  constructor(
    private readonly importarUC: ImportarAlimentos,
    private readonly estadoUC: ObtenerEstadoAlimentosPropios,
    private readonly vaciarUC: VaciarAlimentosPropios,
  ) {}

  async importar(filas: ImportarAlimentosDto): Promise<{ importados: number }> {
    const importados = await this.importarUC.ejecutar(
      filas.map((f) => ({
        nombre: f.nombre,
        marca: f.marca ?? null,
        caloriasPor100: f.caloriasPor100 ?? null,
        proteinasPor100: f.proteinasPor100 ?? null,
        carbohidratosPor100: f.carbohidratosPor100 ?? null,
        grasasPor100: f.grasasPor100 ?? null,
      })),
    );
    return { importados };
  }

  estado(): Promise<EstadoAlimentosPropiosDto> {
    return this.estadoUC.ejecutar();
  }

  vaciar(): Promise<void> {
    return this.vaciarUC.ejecutar();
  }
}
