import type { ImportarAlimentos } from "@/aplicacion/casos-de-uso/nutricion/ImportarAlimentos";
import type { ObtenerEstadoAlimentosPropios } from "@/aplicacion/casos-de-uso/nutricion/ObtenerEstadoAlimentosPropios";
import type { VaciarAlimentosPropios } from "@/aplicacion/casos-de-uso/nutricion/VaciarAlimentosPropios";
import type { CrearAlimentoPropio } from "@/aplicacion/casos-de-uso/nutricion/CrearAlimentoPropio";
import type { ActualizarAlimentoPropio } from "@/aplicacion/casos-de-uso/nutricion/ActualizarAlimentoPropio";
import type { EliminarAlimentoPropio } from "@/aplicacion/casos-de-uso/nutricion/EliminarAlimentoPropio";
import type { ListarAlimentosPropios } from "@/aplicacion/casos-de-uso/nutricion/ListarAlimentosPropios";
import type { AlimentoPropio } from "@/dominio/entidades/AlimentoPropio";
import type {
  EstadoAlimentosPropiosDto,
  ImportarAlimentosDto,
  CrearAlimentoPropioDto,
  ActualizarAlimentoPropioDto,
  ListarAlimentosPropiosDto,
  AlimentoPropioSalidaDto,
  AlimentosPropiosPaginados,
} from "../dtos/alimentoPropio.dto";

/**
 * Servicio de aplicación de los alimentos propios del nutricionista. Orquesta la
 * importación masiva (Excel, reemplaza la lista), la gestión manual (alta,
 * edición y baja de un alimento a la vez), el estado (para la UI) y el vaciado.
 */
export class ServicioAlimentosPropios {
  constructor(
    private readonly importarUC: ImportarAlimentos,
    private readonly estadoUC: ObtenerEstadoAlimentosPropios,
    private readonly vaciarUC: VaciarAlimentosPropios,
    private readonly crearUC: CrearAlimentoPropio,
    private readonly actualizarUC: ActualizarAlimentoPropio,
    private readonly eliminarUC: EliminarAlimentoPropio,
    private readonly listarUC: ListarAlimentosPropios,
  ) {}

  async importar(filas: ImportarAlimentosDto): Promise<{ importados: number }> {
    const importados = await this.importarUC.ejecutar(
      filas.map((f) => ({
        nombre: f.nombre,
        marca: f.marca ?? null,
        caloriasPor100: f.caloriasPor100 ?? null,
        proteinasPor100: f.proteinasPor100 ?? null,
        carbohidratosPor100: f.carbohidratosPor100 ?? null,
        grasasPor100: f.grasasPor100 ?? null,
      })),
    );
    return { importados };
  }

  estado(): Promise<EstadoAlimentosPropiosDto> {
    return this.estadoUC.ejecutar();
  }

  vaciar(): Promise<void> {
    return this.vaciarUC.ejecutar();
  }

  async listar(
    datos: ListarAlimentosPropiosDto,
  ): Promise<AlimentosPropiosPaginados> {
    const resultado = await this.listarUC.ejecutar(datos);
    return {
      alimentos: resultado.alimentos.map(ServicioAlimentosPropios.aSalida),
      total: resultado.total,
      paginas: resultado.paginas,
    };
  }

  async crear(datos: CrearAlimentoPropioDto): Promise<AlimentoPropioSalidaDto> {
    const alimento = await this.crearUC.ejecutar({
      nombre: datos.nombre,
      marca: datos.marca ?? null,
      caloriasPor100: datos.caloriasPor100 ?? null,
      proteinasPor100: datos.proteinasPor100 ?? null,
      carbohidratosPor100: datos.carbohidratosPor100 ?? null,
      grasasPor100: datos.grasasPor100 ?? null,
    });
    return ServicioAlimentosPropios.aSalida(alimento);
  }

  async actualizar(
    datos: ActualizarAlimentoPropioDto,
  ): Promise<AlimentoPropioSalidaDto> {
    const { id, ...cambios } = datos;
    const alimento = await this.actualizarUC.ejecutar(id, cambios);
    return ServicioAlimentosPropios.aSalida(alimento);
  }

  eliminar(id: string): Promise<void> {
    return this.eliminarUC.ejecutar(id);
  }

  private static aSalida(alimento: AlimentoPropio): AlimentoPropioSalidaDto {
    return alimento.aPrimitivos();
  }
}
