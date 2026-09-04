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
  LecturaHistoriaClinicaDto,
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

  /**
   * Lee el documento subido y devuelve la historia clínica MÁS las evoluciones
   * de control que traiga. No persiste nada: los dos formularios se precargan
   * y el profesional confirma.
   */
  async interpretarDesdeArchivo(
    datos: InterpretarHistoriaClinicaDto,
  ): Promise<LecturaHistoriaClinicaDto> {
    const { campos, evoluciones } = await this.interpretarUC.ejecutar(datos);
    return {
      campos: {
        motivoConsulta: campos.motivoConsulta ?? null,
        diagnosticos: campos.diagnosticos ?? null,
        medicacion: campos.medicacion ?? null,
        antecedentesPersonales: campos.antecedentesPersonales ?? null,
        antecedentesFamiliares: campos.antecedentesFamiliares ?? null,
        habitos: campos.habitos ?? null,
        contexto: campos.contexto ?? null,
      },
      evoluciones: evoluciones.map((evolucion) => ({
        fecha: evolucion.fecha,
        cumplimientoDieta: evolucion.cumplimientoDieta ?? null,
        entrenamiento: evolucion.entrenamiento ?? null,
        deposiciones: evolucion.deposiciones ?? null,
        orina: evolucion.orina ?? null,
        descanso: evolucion.descanso ?? null,
        indispuesta: evolucion.indispuesta ?? null,
        sePercibe: evolucion.sePercibe ?? null,
        camposPersonalizados: evolucion.camposPersonalizados,
      })),
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
