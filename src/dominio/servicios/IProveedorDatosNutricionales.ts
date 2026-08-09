/**
 * Puerto de dominio: fuente externa de datos nutricionales de alimentos
 * (p. ej. Open Food Facts). Se usa para autocompletar los ingredientes de una
 * receta con sus macros por 100 g. La implementación vive en infraestructura y
 * degrada de forma elegante: si la fuente no está disponible, devuelve [] y la
 * receta se carga a mano.
 */

/** Un alimento encontrado en la base nutricional (macros por 100 g). */
export interface AlimentoNutricional {
  nombre: string;
  marca: string | null;
  /** Identificador en la fuente (código de barras/id), para trazabilidad. */
  referenciaExterna: string | null;
  /** Origen del dato: "OFF" (Open Food Facts), etc. */
  fuente: string;
  caloriasPor100: number | null;
  proteinasPor100: number | null;
  carbohidratosPor100: number | null;
  grasasPor100: number | null;
}

/**
 * Criterios del nutricionista para filtrar los alimentos que trae la búsqueda.
 * Todos opcionales: un criterio "vacío" (o `undefined`) deja pasar todo.
 */
export interface CriterioAlimentos {
  /** Solo alimentos genéricos (descarta los que tienen marca). */
  excluirMarcas: boolean;
  /** Descarta los que no tienen los 4 macros completos. */
  requiereMacros: boolean;
  /** Tope de kcal por 100 g (null = sin tope). */
  maxCaloriasPor100: number | null;
  /** Descarta si el nombre contiene alguno de estos textos. */
  excluirTexto: string[];
}

export interface IProveedorDatosNutricionales {
  /**
   * Busca alimentos por texto libre. Devuelve como máximo `limite` resultados
   * (defecto 10). `criterio` (opcional) filtra los resultados según la política
   * del nutricionista. Nunca lanza por fallo de red: ante error o proveedor
   * deshabilitado devuelve [].
   */
  buscar(
    termino: string,
    limite?: number,
    criterio?: CriterioAlimentos,
  ): Promise<AlimentoNutricional[]>;
}
