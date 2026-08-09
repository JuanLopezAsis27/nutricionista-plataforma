import type {
  IProveedorDatosNutricionales,
  AlimentoNutricional,
  CriterioAlimentos,
} from "@/dominio/servicios/IProveedorDatosNutricionales";
import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import { filtrarAlimentos } from "./filtrarAlimentos";

/**
 * Proveedor de datos nutricionales sobre la lista propia del nutricionista
 * (cargada por Excel). Busca por nombre en su tabla y aplica el criterio de
 * filtrado. No usa ninguna API externa.
 */
export class ProveedorNutricionPropio implements IProveedorDatosNutricionales {
  constructor(private readonly repositorio: IAlimentoPropioRepositorio) {}

  async buscar(
    termino: string,
    limite = 10,
    criterio?: CriterioAlimentos,
  ): Promise<AlimentoNutricional[]> {
    const t = termino.trim();
    if (t.length < 2) return [];

    const encontrados = await this.repositorio.buscar(t, limite);
    const alimentos: AlimentoNutricional[] = encontrados.map((a) => {
      const p = a.aPrimitivos();
      return {
        nombre: p.nombre,
        marca: p.marca,
        referenciaExterna: null,
        fuente: "PROPIO",
        caloriasPor100: p.caloriasPor100,
        proteinasPor100: p.proteinasPor100,
        carbohidratosPor100: p.carbohidratosPor100,
        grasasPor100: p.grasasPor100,
      };
    });
    return filtrarAlimentos(alimentos, criterio);
  }
}
