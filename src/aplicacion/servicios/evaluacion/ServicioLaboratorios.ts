import type { RegistrarLaboratorio } from "@/dominio/casos-de-uso/evaluacion/RegistrarLaboratorio";
import type { ActualizarLaboratorio } from "@/dominio/casos-de-uso/evaluacion/ActualizarLaboratorio";
import type { EliminarLaboratorio } from "@/dominio/casos-de-uso/evaluacion/EliminarLaboratorio";
import type { ObtenerLaboratorios } from "@/dominio/casos-de-uso/evaluacion/ObtenerLaboratorios";
import type {
  RegistrarLaboratorioDto,
  ActualizarLaboratorioDto,
  LaboratorioSalidaDto,
} from "../../dtos/evaluacion.dto";

/** Servicio de aplicación de los Laboratorios (análisis con adjuntos). */
export class ServicioLaboratorios {
  constructor(
    private readonly registrarUC: RegistrarLaboratorio,
    private readonly actualizarUC: ActualizarLaboratorio,
    private readonly eliminarUC: EliminarLaboratorio,
    private readonly obtenerUC: ObtenerLaboratorios,
  ) {}

  async registrar(
    datos: RegistrarLaboratorioDto,
  ): Promise<LaboratorioSalidaDto> {
    const laboratorio = await this.registrarUC.ejecutar(datos);
    return laboratorio.aPrimitivos();
  }

  async actualizar(
    datos: ActualizarLaboratorioDto,
  ): Promise<LaboratorioSalidaDto> {
    const { id, ...cambios } = datos;
    const laboratorio = await this.actualizarUC.ejecutar(id, cambios);
    return laboratorio.aPrimitivos();
  }

  async eliminar(id: string): Promise<void> {
    await this.eliminarUC.ejecutar(id);
  }

  async obtener(pacienteId: string): Promise<LaboratorioSalidaDto[]> {
    const laboratorios = await this.obtenerUC.ejecutar(pacienteId);
    return laboratorios.map((laboratorio) => laboratorio.aPrimitivos());
  }
}
