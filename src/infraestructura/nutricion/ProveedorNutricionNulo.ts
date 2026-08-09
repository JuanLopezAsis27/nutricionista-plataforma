import type {
  IProveedorDatosNutricionales,
  AlimentoNutricional,
} from "@/dominio/servicios/IProveedorDatosNutricionales";

/**
 * Proveedor nulo: la búsqueda nutricional está deshabilitada. Siempre devuelve
 * [] para que la UI ofrezca la carga manual de macros. Se usa cuando
 * `NUTRICION_DESHABILITADA=true`.
 */
export class ProveedorNutricionNulo implements IProveedorDatosNutricionales {
  async buscar(): Promise<AlimentoNutricional[]> {
    return [];
  }
}
