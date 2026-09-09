import type { CrearPlanSemanal } from "@/aplicacion/casos-de-uso/planes-semanales/CrearPlanSemanal";
import type { ActualizarPlanSemanal } from "@/aplicacion/casos-de-uso/planes-semanales/ActualizarPlanSemanal";
import type { EliminarPlanSemanal } from "@/aplicacion/casos-de-uso/planes-semanales/EliminarPlanSemanal";
import type { ObtenerPlanSemanalPorId } from "@/aplicacion/casos-de-uso/planes-semanales/ObtenerPlanSemanalPorId";
import type { ObtenerPlanesSemanalesPaginado } from "@/aplicacion/casos-de-uso/planes-semanales/ObtenerPlanesSemanalesPaginado";
import type { AsignarPlanSemanalAPaciente } from "@/aplicacion/casos-de-uso/planes-semanales/AsignarPlanSemanalAPaciente";
import type { DesasignarPlanSemanalDePaciente } from "@/aplicacion/casos-de-uso/planes-semanales/DesasignarPlanSemanalDePaciente";
import type { ObtenerPlanSemanalDelPaciente } from "@/aplicacion/casos-de-uso/planes-semanales/ObtenerPlanSemanalDelPaciente";
import type { ObtenerHistorialDePlanesSemanales } from "@/aplicacion/casos-de-uso/planes-semanales/ObtenerHistorialDePlanesSemanales";
import type { ObtenerPacientesDePlanSemanal } from "@/aplicacion/casos-de-uso/planes-semanales/ObtenerPacientesDePlanSemanal";
import { PlanSemanal } from "@/dominio/entidades/PlanSemanal";
import type { AsignacionPlanSemanal } from "@/dominio/repositorios/IAsignacionPlanSemanalRepositorio";
import type {
  CrearPlanSemanalDto,
  ActualizarPlanSemanalDto,
  ListarPlanesSemanalesDto,
  AsignarPlanSemanalDto,
  PlanSemanalSalidaDto,
  PlanesSemanalesPaginados,
  PlanSemanalDelPacienteDto,
  AsignacionPlanSemanalSalidaDto,
  AsignacionSemanalConPacienteDto,
} from "../dtos/planSemanal.dto";

/**
 * Servicio de aplicación de Planes Semanales.
 * Orquesta los casos de uso y devuelve DTOs de salida.
 */
export class ServicioPlanSemanal {
  constructor(
    private readonly crearUC: CrearPlanSemanal,
    private readonly actualizarUC: ActualizarPlanSemanal,
    private readonly eliminarUC: EliminarPlanSemanal,
    private readonly obtenerPorIdUC: ObtenerPlanSemanalPorId,
    private readonly listarUC: ObtenerPlanesSemanalesPaginado,
    private readonly asignarUC: AsignarPlanSemanalAPaciente,
    private readonly desasignarUC: DesasignarPlanSemanalDePaciente,
    private readonly delPacienteUC: ObtenerPlanSemanalDelPaciente,
    private readonly historialUC: ObtenerHistorialDePlanesSemanales,
    private readonly pacientesDelPlanUC: ObtenerPacientesDePlanSemanal,
  ) {}

  async crearPlanSemanal(
    datos: CrearPlanSemanalDto,
  ): Promise<PlanSemanalSalidaDto> {
    return ServicioPlanSemanal.aSalida(await this.crearUC.ejecutar(datos));
  }

  async actualizarPlanSemanal(
    datos: ActualizarPlanSemanalDto,
  ): Promise<PlanSemanalSalidaDto> {
    return ServicioPlanSemanal.aSalida(await this.actualizarUC.ejecutar(datos));
  }

  async eliminarPlanSemanal(id: string): Promise<void> {
    await this.eliminarUC.ejecutar(id);
  }

  async obtenerPlanSemanalPorId(id: string): Promise<PlanSemanalSalidaDto> {
    return ServicioPlanSemanal.aSalida(await this.obtenerPorIdUC.ejecutar(id));
  }

  async obtenerPlanesSemanales(
    datos: ListarPlanesSemanalesDto,
  ): Promise<PlanesSemanalesPaginados> {
    const { items, total, paginas } = await this.listarUC.ejecutar(datos);
    return { planes: items.map(ServicioPlanSemanal.aSalida), total, paginas };
  }

  async asignarPlanSemanalAPaciente(
    datos: AsignarPlanSemanalDto,
  ): Promise<AsignacionPlanSemanal> {
    return this.asignarUC.ejecutar(datos);
  }

  async desasignarPlanSemanalDePaciente(pacienteId: string): Promise<void> {
    await this.desasignarUC.ejecutar(pacienteId);
  }

  /**
   * El plan semanal vigente del paciente, con cada día comparado contra las
   * metas de SU PLAN NUTRICIONAL (ver el caso de uso). Null si no tiene uno.
   */
  async obtenerPlanSemanalDelPaciente(
    pacienteId: string,
  ): Promise<PlanSemanalDelPacienteDto | null> {
    const resultado = await this.delPacienteUC.ejecutar(pacienteId);
    if (!resultado) return null;
    return {
      plan: ServicioPlanSemanal.aSalida(resultado.plan),
      metas: resultado.metas,
      nombrePlanDeLasMetas: resultado.nombrePlanDeLasMetas,
      dias: resultado.dias,
    };
  }

  async obtenerHistorialDePaciente(
    pacienteId: string,
  ): Promise<AsignacionPlanSemanalSalidaDto[]> {
    return this.historialUC.ejecutar(pacienteId);
  }

  async obtenerPacientesDePlanSemanal(
    planSemanalId: string,
  ): Promise<AsignacionSemanalConPacienteDto[]> {
    return this.pacientesDelPlanUC.ejecutar(planSemanalId);
  }

  /**
   * DTO de salida. Cada comida sale con sus macros YA RESUELTOS (alimentos más
   * la receta por sus porciones) y el plan con el total de cada día: es la
   * misma cuenta para todas las pantallas, y repetirla en cada una es lo que
   * hace que dos vistas del mismo plan muestren números distintos.
   */
  private static aSalida(plan: PlanSemanal): PlanSemanalSalidaDto {
    const datos = plan.aPrimitivos();
    return {
      id: datos.id,
      nombre: datos.nombre,
      descripcion: datos.descripcion,
      franjas: datos.franjas.map((franja) => ({
        ...franja,
        comidas: franja.comidas.map((comida) => ({
          ...comida,
          macros: PlanSemanal.macrosDe(comida),
        })),
      })),
      totalesPorDia: plan.totalesPorDia(),
      creadoEn: datos.creadoEn,
      actualizadoEn: datos.actualizadoEn,
    };
  }
}
