import type {
  IProveedorDatosNutricionales,
  CriterioAlimentos,
} from "@/dominio/servicios/IProveedorDatosNutricionales";
import type { ICredencialesIntegracionRepositorio } from "@/dominio/repositorios/ICredencialesIntegracionRepositorio";
import type {
  AlimentoNutricionalSalidaDto,
  BuscarAlimentoDto,
} from "../dtos/nutricion.dto";

/**
 * Servicio de aplicación de datos nutricionales: expone la búsqueda de
 * alimentos (para autocompletar ingredientes de recetas) sobre el proveedor
 * externo, aplicando los criterios de filtrado que configuró el nutricionista.
 * Nunca lanza por fallo de red (el proveedor degrada a []).
 */
export class ServicioNutricion {
  constructor(
    private readonly proveedor: IProveedorDatosNutricionales,
    private readonly credenciales: ICredencialesIntegracionRepositorio,
  ) {}

  async buscarAlimento(
    datos: BuscarAlimentoDto,
  ): Promise<AlimentoNutricionalSalidaDto[]> {
    const criterio = await this.resolverCriterio();
    return this.proveedor.buscar(datos.termino, datos.limite ?? 10, criterio);
  }

  /** Criterios guardados del inquilino (o `undefined` si no hay/está vacío). */
  private async resolverCriterio(): Promise<CriterioAlimentos | undefined> {
    try {
      const c = await this.credenciales.obtener();
      return c?.criterios;
    } catch {
      return undefined; // sin alcance de inquilino → sin filtro
    }
  }
}
