import type { GuardarHistoriaClinica } from "@/aplicacion/casos-de-uso/evaluacion/GuardarHistoriaClinica";
import type { ObtenerHistoriaClinica } from "@/aplicacion/casos-de-uso/evaluacion/ObtenerHistoriaClinica";
import type { InterpretarHistoriaClinica } from "@/aplicacion/casos-de-uso/evaluacion/InterpretarHistoriaClinica";
import type {
  GuardarHistoriaClinicaDto,
  HistoriaClinicaSalidaDto,
  InterpretarHistoriaClinicaDto,
  HistoriaClinicaSugeridaDto,
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
    private readonly interpretarUC: InterpretarHistoriaClinica,
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

  async interpretarDesdeArchivo(
    datos: InterpretarHistoriaClinicaDto,
  ): Promise<HistoriaClinicaSugeridaDto> {
    const sugerido = await this.interpretarUC.ejecutar(datos);
    return {
      motivoConsulta: sugerido.motivoConsulta ?? null,
      diagnosticos: sugerido.diagnosticos ?? null,
      medicacion: sugerido.medicacion ?? null,
      antecedentesPersonales: sugerido.antecedentesPersonales ?? null,
      antecedentesFamiliares: sugerido.antecedentesFamiliares ?? null,
      habitos: sugerido.habitos ?? null,
      contexto: sugerido.contexto ?? null,
    };
  }
}
