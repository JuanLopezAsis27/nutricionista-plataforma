import type { IPacienteRepositorio } from "../../repositorios/IPacienteRepositorio";
import type { Paciente } from "../../entidades/Paciente";

/** Parámetros de paginación/búsqueda (tipo de entrada del dominio). */
export interface ParametrosPaginacionPacientes {
  pagina: number;
  porPagina: number;
  busqueda?: string;
  incluirArchivados?: boolean;
}

/** Resultado paginado de entidades Paciente. */
export interface PacientesPaginados {
  pacientes: Paciente[];
  total: number;
  paginas: number;
}

/**
 * Caso de uso: listar pacientes con búsqueda y paginación.
 * Calcula el desplazamiento a partir de la página y devuelve el total de
 * páginas junto con los pacientes de la página solicitada.
 */
export class ObtenerPacientes {
  constructor(private readonly repositorio: IPacienteRepositorio) {}

  async ejecutar(params: ParametrosPaginacionPacientes): Promise<PacientesPaginados> {
    const { pagina, porPagina, busqueda, incluirArchivados } = params;
    const desplazamiento = (pagina - 1) * porPagina;

    const [pacientes, total] = await Promise.all([
      this.repositorio.listar({
        busqueda,
        incluirArchivados,
        limite: porPagina,
        desplazamiento,
      }),
      this.repositorio.contar({ busqueda, incluirArchivados }),
    ]);

    const paginas = Math.max(1, Math.ceil(total / porPagina));
    return { pacientes, total, paginas };
  }
}
