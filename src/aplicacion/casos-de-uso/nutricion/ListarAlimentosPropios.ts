import type { IAlimentoPropioRepositorio } from "@/dominio/repositorios/IAlimentoPropioRepositorio";
import type {
  AlimentoPropio,
  CategoriaAlimento,
} from "@/dominio/entidades/AlimentoPropio";

/** Parámetros de paginación/búsqueda de la gestión manual. */
export interface ParametrosPaginacionAlimentosPropios {
  pagina: number;
  porPagina: number;
  busqueda?: string;
  categoria?: CategoriaAlimento;
}

/** Resultado paginado de entidades AlimentoPropio. */
export interface AlimentosPropiosPaginados {
  alimentos: AlimentoPropio[];
  total: number;
  paginas: number;
}

/**
 * Caso de uso: listar los alimentos propios con búsqueda y paginación, para la
 * pantalla de gestión (ver/editar/agregar).
 */
export class ListarAlimentosPropios {
  constructor(private readonly repositorio: IAlimentoPropioRepositorio) {}

  async ejecutar(
    params: ParametrosPaginacionAlimentosPropios,
  ): Promise<AlimentosPropiosPaginados> {
    // Los filtros se enumeran a mano: el que no esté acá se descarta en
    // silencio (le pasó al listado de planes con la carpeta).
    const { pagina, porPagina, busqueda, categoria } = params;
    const desplazamiento = (pagina - 1) * porPagina;

    const [alimentos, total] = await Promise.all([
      this.repositorio.listar({
        busqueda,
        categoria,
        limite: porPagina,
        desplazamiento,
      }),
      this.repositorio.contar({ busqueda, categoria }),
    ]);

    const paginas = Math.max(1, Math.ceil(total / porPagina));
    return { alimentos, total, paginas };
  }
}
