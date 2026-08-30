import type { GuardarHistoriaClinica } from "@/aplicacion/casos-de-uso/evaluacion/GuardarHistoriaClinica";
import type { ObtenerHistoriaClinica } from "@/aplicacion/casos-de-uso/evaluacion/ObtenerHistoriaClinica";
import type {
  GuardarHistoriaClinicaDto,
  HistoriaClinicaSalidaDto,
} from "../../dtos/evaluacion.dto";

/**
 * Servicio de aplicación de la Historia Clínica.
 *
 * Uno de los cuatro subdominios que antes convivían en `ServicioEvaluacion`
 * con un constructor de 20 dependencias. Este necesita dos.
 */
export class ServicioHistoriaClinica {
  constructor(
    private readonly guardarUC: GuardarHistoriaClinica,
    private readonly obtenerUC: ObtenerHistoriaClinica,
  ) {}

  async guardar(
    datos: GuardarHistoriaClinicaDto,
  ): Promise<HistoriaClinicaSalidaDto> {
    const historia = await this.guardarUC.ejecutar(datos);
    return historia.aPrimitivos();
  }

  async obtener(pacienteId: string): Promise<HistoriaClinicaSalidaDto | null> {
    const historia = await this.obtenerUC.ejecutar(pacienteId);
    return historia ? historia.aPrimitivos() : null;
  }
}
