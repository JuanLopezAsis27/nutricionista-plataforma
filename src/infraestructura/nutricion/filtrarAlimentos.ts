import type {
  AlimentoNutricional,
  CriterioAlimentos,
} from "@/dominio/servicios/IProveedorDatosNutricionales";

/**
 * Filtra alimentos según el criterio del nutricionista. Espejo de `filtro.go`
 * del servicio Go: se usa en el proveedor local (cuando la app resuelve
 * FatSecret/OFF directo, sin el servicio Go). Un criterio `undefined` no filtra.
 */
export function filtrarAlimentos(
  alimentos: AlimentoNutricional[],
  criterio?: CriterioAlimentos,
): AlimentoNutricional[] {
  if (!criterio) return alimentos;

  return alimentos.filter((a) => {
    if (criterio.excluirMarcas && a.marca && a.marca.trim() !== "")
      return false;
    if (criterio.requiereMacros && !macrosCompletos(a)) return false;
    if (
      criterio.maxCaloriasPor100 != null &&
      a.caloriasPor100 != null &&
      a.caloriasPor100 > criterio.maxCaloriasPor100
    ) {
      return false;
    }
    if (contieneAlguno(a.nombre, criterio.excluirTexto)) return false;
    return true;
  });
}

function macrosCompletos(a: AlimentoNutricional): boolean {
  return (
    a.caloriasPor100 != null &&
    a.proteinasPor100 != null &&
    a.carbohidratosPor100 != null &&
    a.grasasPor100 != null
  );
}

function contieneAlguno(nombre: string, textos: string[]): boolean {
  const n = nombre.toLowerCase();
  return textos.some((t) => {
    const limpio = t.trim().toLowerCase();
    return limpio !== "" && n.includes(limpio);
  });
}
