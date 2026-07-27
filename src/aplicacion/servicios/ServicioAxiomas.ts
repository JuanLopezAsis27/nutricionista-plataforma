import type { CrearAxioma } from "@/dominio/casos-de-uso/axiomas/CrearAxioma";
import type { ActualizarAxioma } from "@/dominio/casos-de-uso/axiomas/ActualizarAxioma";
import type { EliminarAxioma } from "@/dominio/casos-de-uso/axiomas/EliminarAxioma";
import type { ListarAxiomas } from "@/dominio/casos-de-uso/axiomas/ListarAxiomas";
import type { ListarAxiomasActivos } from "@/dominio/casos-de-uso/axiomas/ListarAxiomasActivos";
import type { AxiomaNutricional } from "@/dominio/entidades/AxiomaNutricional";
import type {
  CrearAxiomaDto,
  ActualizarAxiomaDto,
  AxiomaSalidaDto,
} from "../dtos/axioma.dto";

/**
 * Servicio de aplicación de la Base de conocimiento: gestiona los axiomas que
 * miden el tracking del paciente y, a futuro, guían a la IA.
 */
export class ServicioAxiomas {
  constructor(
    private readonly crearUC: CrearAxioma,
    private readonly actualizarUC: ActualizarAxioma,
    private readonly eliminarUC: EliminarAxioma,
    private readonly listarUC: ListarAxiomas,
    private readonly listarActivosUC: ListarAxiomasActivos,
  ) {}

  async listar(): Promise<AxiomaSalidaDto[]> {
    return (await this.listarUC.ejecutar()).map(ServicioAxiomas.aSalida);
  }

  async listarActivos(): Promise<AxiomaSalidaDto[]> {
    return (await this.listarActivosUC.ejecutar()).map(ServicioAxiomas.aSalida);
  }

  async crear(datos: CrearAxiomaDto): Promise<AxiomaSalidaDto> {
    return ServicioAxiomas.aSalida(await this.crearUC.ejecutar(datos));
  }

  async actualizar(datos: ActualizarAxiomaDto): Promise<AxiomaSalidaDto> {
    const { id, ...cambios } = datos;
    return ServicioAxiomas.aSalida(await this.actualizarUC.ejecutar(id, cambios));
  }

  async eliminar(id: string): Promise<void> {
    await this.eliminarUC.ejecutar(id);
  }

  private static aSalida(axioma: AxiomaNutricional): AxiomaSalidaDto {
    return axioma.aPrimitivos();
  }
}
