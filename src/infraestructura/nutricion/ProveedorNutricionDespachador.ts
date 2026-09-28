import type {
  IProveedorDatosNutricionales,
  AlimentoNutricional,
  CriterioAlimentos,
} from "@/dominio/servicios/IProveedorDatosNutricionales";
import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import {
  claveIdentidadAlimento,
  type CategoriaAlimento,
} from "@/dominio/entidades/AlimentoPropio";

/** Una lista de alimentos cargada, con el repositorio que dice si tiene algo. */
export interface ListaDeAlimentos {
  proveedor: IProveedorDatosNutricionales;
  repositorio: IAlimentoPropioRepositorio;
}

/**
 * Despachador de la búsqueda de alimentos.
 *
 * Hay dos listas cargadas a mano: la del consultorio (su Excel y sus altas) y
 * la PREDETERMINADA de la plataforma, que carga el SUPERADMIN (migración 82).
 * Si alguna de las dos tiene alimentos, la búsqueda las usa a las dos —la del
 * consultorio primero: es la que el profesional armó para sí— y NO sale a
 * internet. Si las dos están vacías, delega en el proveedor externo (Open Food
 * Facts), que es lo que pasaba antes de que existieran.
 *
 * El orden de `listas` es el de prioridad. Un alimento con el mismo nombre y
 * marca en las dos aparece una vez, el de la primera: si el profesional
 * corrigió los macros de la versión de la plataforma, manda la suya.
 */
export class ProveedorNutricionDespachador implements IProveedorDatosNutricionales {
  constructor(
    private readonly listas: ListaDeAlimentos[],
    private readonly externo: IProveedorDatosNutricionales,
  ) {}

  async buscar(
    termino: string,
    limite = 10,
    criterio?: CriterioAlimentos,
    categoria?: CategoriaAlimento,
  ): Promise<AlimentoNutricional[]> {
    const conDatos = await this.listasConDatos();
    if (conDatos.length === 0) {
      return this.externo.buscar(termino, limite, criterio, categoria);
    }

    const resultados = await Promise.all(
      conDatos.map((lista) =>
        lista.proveedor.buscar(termino, limite, criterio, categoria),
      ),
    );
    const vistos = new Set<string>();
    const combinados: AlimentoNutricional[] = [];
    for (const alimento of resultados.flat()) {
      // La MISMA identidad que usa el control de duplicados (nombre y marca
      // sin mayúsculas, tildes ni espacios de más): con solo minúsculas,
      // «Yogur» propio y «Yógur» de la plataforma salían los dos.
      const clave = claveIdentidadAlimento(alimento.nombre, alimento.marca);
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      combinados.push(alimento);
      if (combinados.length >= limite) break;
    }
    return combinados;
  }

  private async listasConDatos(): Promise<ListaDeAlimentos[]> {
    const cantidades = await Promise.all(
      this.listas.map(async (lista) => {
        try {
          return await lista.repositorio.contar();
        } catch {
          return 0; // sin alcance de inquilino → esa lista no aplica
        }
      }),
    );
    return this.listas.filter((_, i) => (cantidades[i] ?? 0) > 0);
  }
}
