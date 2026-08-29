import type { RegistrarAlertaAlimentaria } from "@/dominio/casos-de-uso/evaluacion/RegistrarAlertaAlimentaria";
import type { ActualizarAlertaAlimentaria } from "@/dominio/casos-de-uso/evaluacion/ActualizarAlertaAlimentaria";
import type { EliminarAlertaAlimentaria } from "@/dominio/casos-de-uso/evaluacion/EliminarAlertaAlimentaria";
import type { ObtenerAlertasAlimentarias } from "@/dominio/casos-de-uso/evaluacion/ObtenerAlertasAlimentarias";
import type {
  RegistrarAlertaAlimentariaDto,
  ActualizarAlertaAlimentariaDto,
  AlertaAlimentariaSalidaDto,
} from "../../dtos/evaluacion.dto";

/** Servicio de aplicación de las Alertas Alimentarias (alergias, intolerancias). */
export class ServicioAlertasAlimentarias {
  constructor(
    private readonly registrarUC: RegistrarAlertaAlimentaria,
    private readonly actualizarUC: ActualizarAlertaAlimentaria,
    private readonly eliminarUC: EliminarAlertaAlimentaria,
    private readonly obtenerUC: ObtenerAlertasAlimentarias,
  ) {}

  async registrar(
    datos: RegistrarAlertaAlimentariaDto,
  ): Promise<AlertaAlimentariaSalidaDto> {
    const alerta = await this.registrarUC.ejecutar(datos);
    return alerta.aPrimitivos();
  }

  async actualizar(
    datos: ActualizarAlertaAlimentariaDto,
  ): Promise<AlertaAlimentariaSalidaDto> {
    const { id, ...cambios } = datos;
    const alerta = await this.actualizarUC.ejecutar(id, cambios);
    return alerta.aPrimitivos();
  }

  async eliminar(id: string): Promise<void> {
    await this.eliminarUC.ejecutar(id);
  }

  async obtener(pacienteId: string): Promise<AlertaAlimentariaSalidaDto[]> {
    const alertas = await this.obtenerUC.ejecutar(pacienteId);
    return alertas.map((alerta) => alerta.aPrimitivos());
  }
}
