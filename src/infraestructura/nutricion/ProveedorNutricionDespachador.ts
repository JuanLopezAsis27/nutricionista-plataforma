import type {
  IProveedorDatosNutricionales,
  AlimentoNutricional,
  CriterioAlimentos,
} from "@/dominio/servicios/IProveedorDatosNutricionales";
import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";

/**
 * Despachador de la búsqueda de ingredientes: si el inquilino cargó su propia
 * lista de alimentos (Excel), la usa EXCLUSIVAMENTE y NO consulta FatSecret /
 * el servicio Go / Open Food Facts. Si la lista está vacía, delega en el
 * proveedor externo (FatSecret con degradación a OFF).
 */
export class ProveedorNutricionDespachador implements IProveedorDatosNutricionales {
  constructor(
    private readonly propio: IProveedorDatosNutricionales,
    private readonly externo: IProveedorDatosNutricionales,
    private readonly alimentosPropios: IAlimentoPropioRepositorio,
  ) {}

  async buscar(
    termino: string,
    limite = 10,
    criterio?: CriterioAlimentos,
  ): Promise<AlimentoNutricional[]> {
    if (await this.tieneListaPropia()) {
      return this.propio.buscar(termino, limite, criterio);
    }
    return this.externo.buscar(termino, limite, criterio);
  }

  private async tieneListaPropia(): Promise<boolean> {
    try {
      return (await this.alimentosPropios.contar()) > 0;
    } catch {
      return false; // sin alcance de inquilino → externo
    }
  }
}
