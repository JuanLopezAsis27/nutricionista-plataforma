import type { GuardarHistoriaClinica } from "@/dominio/casos-de-uso/evaluacion/GuardarHistoriaClinica";
import type { ObtenerHistoriaClinica } from "@/dominio/casos-de-uso/evaluacion/ObtenerHistoriaClinica";
import type { RegistrarAntropometria } from "@/dominio/casos-de-uso/evaluacion/RegistrarAntropometria";
import type { ActualizarAntropometria } from "@/dominio/casos-de-uso/evaluacion/ActualizarAntropometria";
import type { EliminarAntropometria } from "@/dominio/casos-de-uso/evaluacion/EliminarAntropometria";
import type { ObtenerEvolucionAntropometrica } from "@/dominio/casos-de-uso/evaluacion/ObtenerEvolucionAntropometrica";
import type { RegistrarAlertaAlimentaria } from "@/dominio/casos-de-uso/evaluacion/RegistrarAlertaAlimentaria";
import type { ActualizarAlertaAlimentaria } from "@/dominio/casos-de-uso/evaluacion/ActualizarAlertaAlimentaria";
import type { EliminarAlertaAlimentaria } from "@/dominio/casos-de-uso/evaluacion/EliminarAlertaAlimentaria";
import type { ObtenerAlertasAlimentarias } from "@/dominio/casos-de-uso/evaluacion/ObtenerAlertasAlimentarias";
import type { RegistrarLaboratorio } from "@/dominio/casos-de-uso/evaluacion/RegistrarLaboratorio";
import type { ActualizarLaboratorio } from "@/dominio/casos-de-uso/evaluacion/ActualizarLaboratorio";
import type { EliminarLaboratorio } from "@/dominio/casos-de-uso/evaluacion/EliminarLaboratorio";
import type { ObtenerLaboratorios } from "@/dominio/casos-de-uso/evaluacion/ObtenerLaboratorios";
import type {
  GuardarHistoriaClinicaDto,
  HistoriaClinicaSalidaDto,
  RegistrarAntropometriaDto,
  ActualizarAntropometriaDto,
  EvolucionAntropometricaDto,
  MedicionEvolucionDto,
  RegistrarAlertaAlimentariaDto,
  ActualizarAlertaAlimentariaDto,
  AlertaAlimentariaSalidaDto,
  RegistrarLaboratorioDto,
  ActualizarLaboratorioDto,
  LaboratorioSalidaDto,
} from "../dtos/evaluacion.dto";

/**
 * Servicio de aplicación de Evaluación Integral.
 * Orquesta los casos de uso de historia clínica, antropometría, alertas
 * alimentarias y laboratorios; devuelve DTOs de salida.
 */
export class ServicioEvaluacion {
  constructor(
    private readonly guardarHistoriaUC: GuardarHistoriaClinica,
    private readonly obtenerHistoriaUC: ObtenerHistoriaClinica,
    private readonly registrarAntropometriaUC: RegistrarAntropometria,
    private readonly actualizarAntropometriaUC: ActualizarAntropometria,
    private readonly eliminarAntropometriaUC: EliminarAntropometria,
    private readonly obtenerEvolucionUC: ObtenerEvolucionAntropometrica,
    private readonly registrarAlertaUC: RegistrarAlertaAlimentaria,
    private readonly actualizarAlertaUC: ActualizarAlertaAlimentaria,
    private readonly eliminarAlertaUC: EliminarAlertaAlimentaria,
    private readonly obtenerAlertasUC: ObtenerAlertasAlimentarias,
    private readonly registrarLaboratorioUC: RegistrarLaboratorio,
    private readonly actualizarLaboratorioUC: ActualizarLaboratorio,
    private readonly eliminarLaboratorioUC: EliminarLaboratorio,
    private readonly obtenerLaboratoriosUC: ObtenerLaboratorios,
  ) {}

  // --- Historia clínica -------------------------------------------------------

  async guardarHistoriaClinica(
    datos: GuardarHistoriaClinicaDto,
  ): Promise<HistoriaClinicaSalidaDto> {
    const historia = await this.guardarHistoriaUC.ejecutar(datos);
    return historia.aPrimitivos();
  }

  async obtenerHistoriaClinica(
    pacienteId: string,
  ): Promise<HistoriaClinicaSalidaDto | null> {
    const historia = await this.obtenerHistoriaUC.ejecutar(pacienteId);
    return historia ? historia.aPrimitivos() : null;
  }

  // --- Antropometría ----------------------------------------------------------

  async registrarAntropometria(
    datos: RegistrarAntropometriaDto,
  ): Promise<EvolucionAntropometricaDto> {
    await this.registrarAntropometriaUC.ejecutar(datos);
    return this.obtenerEvolucion(datos.pacienteId);
  }

  async actualizarAntropometria(
    datos: ActualizarAntropometriaDto,
  ): Promise<EvolucionAntropometricaDto> {
    const { id, ...cambios } = datos;
    const medicion = await this.actualizarAntropometriaUC.ejecutar(id, cambios);
    return this.obtenerEvolucion(medicion.pacienteId);
  }

  async eliminarAntropometria(id: string): Promise<void> {
    await this.eliminarAntropometriaUC.ejecutar(id);
  }

  async obtenerEvolucion(pacienteId: string): Promise<EvolucionAntropometricaDto> {
    const { mediciones, derivados } = await this.obtenerEvolucionUC.ejecutar(pacienteId);
    const salida: MedicionEvolucionDto[] = mediciones.map((medicion, indice) => ({
      ...medicion.aPrimitivos(),
      sumatoria6Pliegues: derivados[indice]?.sumatoria6Pliegues ?? null,
      kgBajadosVsAnterior: derivados[indice]?.kgBajadosVsAnterior ?? null,
      kgBajadosAcumulados: derivados[indice]?.kgBajadosAcumulados ?? null,
    }));
    return { mediciones: salida };
  }

  // --- Alertas alimentarias ---------------------------------------------------

  async registrarAlerta(
    datos: RegistrarAlertaAlimentariaDto,
  ): Promise<AlertaAlimentariaSalidaDto> {
    const alerta = await this.registrarAlertaUC.ejecutar(datos);
    return alerta.aPrimitivos();
  }

  async actualizarAlerta(
    datos: ActualizarAlertaAlimentariaDto,
  ): Promise<AlertaAlimentariaSalidaDto> {
    const { id, ...cambios } = datos;
    const alerta = await this.actualizarAlertaUC.ejecutar(id, cambios);
    return alerta.aPrimitivos();
  }

  async eliminarAlerta(id: string): Promise<void> {
    await this.eliminarAlertaUC.ejecutar(id);
  }

  async obtenerAlertas(pacienteId: string): Promise<AlertaAlimentariaSalidaDto[]> {
    const alertas = await this.obtenerAlertasUC.ejecutar(pacienteId);
    return alertas.map((alerta) => alerta.aPrimitivos());
  }

  // --- Laboratorios -------------------------------------------------------------

  async registrarLaboratorio(
    datos: RegistrarLaboratorioDto,
  ): Promise<LaboratorioSalidaDto> {
    const laboratorio = await this.registrarLaboratorioUC.ejecutar(datos);
    return laboratorio.aPrimitivos();
  }

  async actualizarLaboratorio(
    datos: ActualizarLaboratorioDto,
  ): Promise<LaboratorioSalidaDto> {
    const { id, ...cambios } = datos;
    const laboratorio = await this.actualizarLaboratorioUC.ejecutar(id, cambios);
    return laboratorio.aPrimitivos();
  }

  async eliminarLaboratorio(id: string): Promise<void> {
    await this.eliminarLaboratorioUC.ejecutar(id);
  }

  async obtenerLaboratorios(pacienteId: string): Promise<LaboratorioSalidaDto[]> {
    const laboratorios = await this.obtenerLaboratoriosUC.ejecutar(pacienteId);
    return laboratorios.map((laboratorio) => laboratorio.aPrimitivos());
  }
}
