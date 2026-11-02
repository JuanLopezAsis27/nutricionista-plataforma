import type {
  IProveedorDatosNutricionales,
  AlimentoNutricional,
  CriterioAlimentos,
} from "@/dominio/servicios/IProveedorDatosNutricionales";
import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import { filtrarAlimentos } from "./filtrarAlimentos";

/**
 * Proveedor de datos nutricionales sobre una lista de alimentos cargada a mano:
 * la propia del nutricionista (`PROPIO`) o la predeterminada de la plataforma
 * (`BASE`, migración 82). Busca por nombre y/o categoría en su tabla y aplica
 * el criterio de filtrado. No usa ninguna API externa.
 *
 * La `fuente` viaja con cada resultado y queda guardada en el alimento de la
 * opción o del ingrediente: dice de qué lista salieron sus macros. Con el `id`
 * y la versión de la imagen, la pantalla pide la imagen a la ruta de esa lista.
 */
export class ProveedorNutricionPropio implements IProveedorDatosNutricionales {
  constructor(
    private readonly repositorio: IAlimentoPropioRepositorio,
    private readonly fuente: "PROPIO" | "BASE" = "PROPIO",
  ) {}

  async buscar(
    termino: string,
    limite = 10,
    criterio?: CriterioAlimentos,
    categoriaId?: string,
  ): Promise<AlimentoNutricional[]> {
    // Una sola letra no es una búsqueda (traería media lista): se hojea,
    // igual que con el término vacío. Con categoría, es «los lácteos».
    const t = termino.trim().length >= 2 ? termino.trim() : "";

    const encontrados = await this.repositorio.buscar(t, limite, categoriaId);
    const alimentos: AlimentoNutricional[] = encontrados.map((a) => {
      const p = a.aPrimitivos();
      return {
        nombre: p.nombre,
        marca: p.marca,
        referenciaExterna: null,
        fuente: this.fuente,
        caloriasPor100: p.caloriasPor100,
        proteinasPor100: p.proteinasPor100,
        carbohidratosPor100: p.carbohidratosPor100,
        grasasPor100: p.grasasPor100,
        cafeinaPor100: p.cafeinaPor100,
        descripcion: p.descripcion,
        id: p.id,
        categoria: p.categoria,
        imagenVersion: a.imagenVersion,
        unidadBase: p.unidadBase,
        medidas: p.medidas,
      };
    });
    return filtrarAlimentos(alimentos, criterio);
  }
}
