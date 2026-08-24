import type { CrearPlan } from "@/dominio/casos-de-uso/planes/CrearPlan";
import type { ObtenerPlanes } from "@/dominio/casos-de-uso/planes/ObtenerPlanes";
import type { ObtenerPlanesPaginado } from "@/dominio/casos-de-uso/planes/ObtenerPlanesPaginado";
import type { ObtenerPlanPorId } from "@/dominio/casos-de-uso/planes/ObtenerPlanPorId";
import type { ActualizarPlan } from "@/dominio/casos-de-uso/planes/ActualizarPlan";
import type { EliminarPlan } from "@/dominio/casos-de-uso/planes/EliminarPlan";
import type { ArchivarPlan } from "@/dominio/casos-de-uso/planes/ArchivarPlan";
import type { CrearPlanDesdePlantilla } from "@/dominio/casos-de-uso/planes/CrearPlanDesdePlantilla";
import type { AsignarPlanAPaciente } from "@/dominio/casos-de-uso/planes/AsignarPlanAPaciente";
import type { DesasignarPlanDePaciente } from "@/dominio/casos-de-uso/planes/DesasignarPlanDePaciente";
import type { ObtenerPlanDelPaciente } from "@/dominio/casos-de-uso/planes/ObtenerPlanDelPaciente";
import type { PlanNutricional } from "@/dominio/entidades/PlanNutricional";
import type { AsignacionPlan } from "@/dominio/repositorios/IPlanRepositorio";
import type {
  CrearPlanDto,
  ActualizarPlanDto,
  FiltroPlanesDto,
  ListarPlanesPaginadoDto,
  PlanesPaginados,
  ArchivarPlanDto,
  CrearDesdePlantillaDto,
  AsignarPlanDto,
  PlanSalidaDto,
} from "../dtos/plan.dto";

/**
 * Servicio de aplicación de Planes Nutricionales.
 * Orquesta los casos de uso y devuelve DTOs de salida.
 */
export class ServicioPlan {
  constructor(
    private readonly crearUC: CrearPlan,
    private readonly obtenerTodosUC: ObtenerPlanes,
    private readonly obtenerPaginadoUC: ObtenerPlanesPaginado,
    private readonly obtenerPorIdUC: ObtenerPlanPorId,
    private readonly actualizarUC: ActualizarPlan,
    private readonly eliminarUC: EliminarPlan,
    private readonly archivarUC: ArchivarPlan,
    private readonly desdePlantillaUC: CrearPlanDesdePlantilla,
    private readonly asignarUC: AsignarPlanAPaciente,
    private readonly desasignarUC: DesasignarPlanDePaciente,
    private readonly obtenerDelPacienteUC: ObtenerPlanDelPaciente,
  ) {}

  async crearPlan(datos: CrearPlanDto): Promise<PlanSalidaDto> {
    const plan = await this.crearUC.ejecutar(datos);
    return ServicioPlan.aSalida(plan);
  }

  async obtenerPlanesPaginado(datos: ListarPlanesPaginadoDto): Promise<PlanesPaginados> {
    const { items, total, paginas } = await this.obtenerPaginadoUC.ejecutar(datos);
    return { planes: items.map(ServicioPlan.aSalida), total, paginas };
  }

  async obtenerPlanes(filtro?: FiltroPlanesDto): Promise<PlanSalidaDto[]> {
    const planes = await this.obtenerTodosUC.ejecutar(filtro);
    return planes.map(ServicioPlan.aSalida);
  }

  async obtenerPlanPorId(id: string): Promise<PlanSalidaDto> {
    const plan = await this.obtenerPorIdUC.ejecutar(id);
    return ServicioPlan.aSalida(plan);
  }

  async actualizarPlan(datos: ActualizarPlanDto): Promise<PlanSalidaDto> {
    const plan = await this.actualizarUC.ejecutar(datos);
    return ServicioPlan.aSalida(plan);
  }

  async eliminarPlan(id: string): Promise<void> {
    await this.eliminarUC.ejecutar(id);
  }

  async archivarPlan(datos: ArchivarPlanDto): Promise<void> {
    await this.archivarUC.ejecutar(datos);
  }

  async crearPlanDesdePlantilla(datos: CrearDesdePlantillaDto): Promise<PlanSalidaDto> {
    const plan = await this.desdePlantillaUC.ejecutar(datos);
    return ServicioPlan.aSalida(plan);
  }

  async asignarPlanAPaciente(datos: AsignarPlanDto): Promise<AsignacionPlan> {
    return this.asignarUC.ejecutar(datos);
  }

  async desasignarPlanDePaciente(pacienteId: string): Promise<void> {
    await this.desasignarUC.ejecutar(pacienteId);
  }

  async obtenerPlanDelPaciente(pacienteId: string): Promise<PlanSalidaDto | null> {
    const plan = await this.obtenerDelPacienteUC.ejecutar(pacienteId);
    return plan ? ServicioPlan.aSalida(plan) : null;
  }

  private static aSalida(plan: PlanNutricional): PlanSalidaDto {
    return plan.aPrimitivos();
  }
}
