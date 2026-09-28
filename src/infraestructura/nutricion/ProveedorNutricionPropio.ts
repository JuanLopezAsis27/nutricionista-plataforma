import type {
  IProveedorDatosNutricionales,
  AlimentoNutricional,
  CriterioAlimentos,
} from "@/dominio/servicios/IProveedorDatosNutricionales";
import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import type { CategoriaAlimento } from "@/dominio/entidades/AlimentoPropio";
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
    categoria?: CategoriaAlimento,
  ): Promise<AlimentoNutricional[]> {
    const t = termino.trim();
    // Sin categoría hace falta algo que buscar; con categoría, el término
    // vacío es «mostrame los lácteos».
    if (t.length < 2 && !categoria) return [];

    const encontrados = await this.repositorio.buscar(t, limite, categoria);
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
        id: p.id,
        categoria: p.categoria,
        imagenVersion: a.imagenVersion,
      };
    });
    return filtrarAlimentos(alimentos, criterio);
  }
}
