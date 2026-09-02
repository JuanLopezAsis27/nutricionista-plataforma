import type { GuardarHistoriaClinica } from "@/aplicacion/casos-de-uso/evaluacion/GuardarHistoriaClinica";
import type { ObtenerHistoriaClinica } from "@/aplicacion/casos-de-uso/evaluacion/ObtenerHistoriaClinica";
import type { InterpretarHistoriaClinica } from "@/aplicacion/casos-de-uso/evaluacion/InterpretarHistoriaClinica";
import type { ObtenerCamposHistoriaClinica } from "@/aplicacion/casos-de-uso/evaluacion/ObtenerCamposHistoriaClinica";
import type { GuardarCampoHistoriaClinica } from "@/aplicacion/casos-de-uso/evaluacion/GuardarCampoHistoriaClinica";
import type { EliminarCampoHistoriaClinica } from "@/aplicacion/casos-de-uso/evaluacion/EliminarCampoHistoriaClinica";
import type { CampoHistoriaClinica } from "@/dominio/entidades/CampoHistoriaClinica";
import type {
  GuardarHistoriaClinicaDto,
  HistoriaClinicaSalidaDto,
  InterpretarHistoriaClinicaDto,
  HistoriaClinicaSugeridaDto,
  GuardarCampoHistoriaClinicaDto,
  CampoHistoriaClinicaSalidaDto,
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
    private readonly obtenerCamposUC: ObtenerCamposHistoriaClinica,
    private readonly guardarCampoUC: GuardarCampoHistoriaClinica,
    private readonly eliminarCampoUC: EliminarCampoHistoriaClinica,
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

  // --- Campos personalizados definidos por el consultorio ---------------------

  async obtenerCampos(): Promise<CampoHistoriaClinicaSalidaDto[]> {
    const campos = await this.obtenerCamposUC.ejecutar();
    return campos.map(ServicioHistoriaClinica.aSalidaCampo);
  }

  async guardarCampo(
    datos: GuardarCampoHistoriaClinicaDto,
  ): Promise<CampoHistoriaClinicaSalidaDto> {
    const campo = await this.guardarCampoUC.ejecutar(datos);
    return ServicioHistoriaClinica.aSalidaCampo(campo);
  }

  async eliminarCampo(id: string): Promise<void> {
    await this.eliminarCampoUC.ejecutar(id);
  }

  private static aSalidaCampo(
    campo: CampoHistoriaClinica,
  ): CampoHistoriaClinicaSalidaDto {
    const { id, clave, nombre, descripcion, orden } = campo.aPrimitivos();
    return { id, clave, nombre, descripcion, orden };
  }
}
