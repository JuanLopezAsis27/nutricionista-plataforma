import type { IRegistroDiarioRepositorio } from "@/dominio/repositorios/IRegistroDiarioRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { RegistroDiario } from "@/dominio/entidades/RegistroDiario";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import {
  desplazamientoDe,
  totalPaginas,
  type ParametrosPagina,
  type Pagina,
} from "../_paginacion";

/**
 * Caso de uso: registros del diario paginados (vista del nutricionista en la
 * ficha) — la más reciente primero, una página de DÍAS CON CARGA por vez.
 *
 * Es distinto de `ObtenerRegistrosEnRango`: aquella trae una ventana de
 * fechas que puede llegar vacía si el paciente hace tiempo que no carga nada,
 * y no deja ver más atrás que el rango pedido. Esto pagina sobre los
 * registros que EXISTEN, así que la página siempre trae contenido mientras
 * haya historia, sin importar cuántos días de calendario ocupe.
 */
export class ObtenerRegistrosPaginados {
  constructor(
    private readonly registros: IRegistroDiarioRepositorio,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async ejecutar(
    pacienteId: string,
    parametros: ParametrosPagina,
  ): Promise<Pagina<RegistroDiario>> {
    const paciente = await this.pacientes.obtenerPorId(pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(pacienteId);
    }

    const [items, total] = await Promise.all([
      this.registros.listarPaginado(
        pacienteId,
        parametros.porPagina,
        desplazamientoDe(parametros),
      ),
      this.registros.contarRegistros(pacienteId),
    ]);
    return { items, total, paginas: totalPaginas(total, parametros.porPagina) };
  }
}
