import type { CrearPlan } from "@/aplicacion/casos-de-uso/planes/CrearPlan";
import type { ObtenerPlanes } from "@/aplicacion/casos-de-uso/planes/ObtenerPlanes";
import type { ObtenerPlanesPaginado } from "@/aplicacion/casos-de-uso/planes/ObtenerPlanesPaginado";
import type { ObtenerPlanPorId } from "@/aplicacion/casos-de-uso/planes/ObtenerPlanPorId";
import type { ActualizarPlan } from "@/aplicacion/casos-de-uso/planes/ActualizarPlan";
import type { EliminarPlan } from "@/aplicacion/casos-de-uso/planes/EliminarPlan";
import type { ArchivarPlan } from "@/aplicacion/casos-de-uso/planes/ArchivarPlan";
import type { CrearPlanDesdePlantilla } from "@/aplicacion/casos-de-uso/planes/CrearPlanDesdePlantilla";
import type { AsignarPlanAPaciente } from "@/aplicacion/casos-de-uso/planes/AsignarPlanAPaciente";
import type { DesasignarPlanDePaciente } from "@/aplicacion/casos-de-uso/planes/DesasignarPlanDePaciente";
import type { ObtenerPlanDelPaciente } from "@/aplicacion/casos-de-uso/planes/ObtenerPlanDelPaciente";
import type { ObtenerPacientesDePlan } from "@/aplicacion/casos-de-uso/planes/ObtenerPacientesDePlan";
import type { ObtenerHistorialDePlanes } from "@/aplicacion/casos-de-uso/planes/ObtenerHistorialDePlanes";
import type { MoverPlanAGrupo } from "@/aplicacion/casos-de-uso/planes/MoverPlanAGrupo";
import type { CrearGrupoPlan } from "@/aplicacion/casos-de-uso/grupos-plan/CrearGrupoPlan";
import type { ActualizarGrupoPlan } from "@/aplicacion/casos-de-uso/grupos-plan/ActualizarGrupoPlan";
import type { EliminarGrupoPlan } from "@/aplicacion/casos-de-uso/grupos-plan/EliminarGrupoPlan";
import type { ObtenerGruposPlan } from "@/aplicacion/casos-de-uso/grupos-plan/ObtenerGruposPlan";
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
  AsignacionPlanSalidaDto,
  AsignacionConPacienteDto,
  GrupoPlanDto,
  ActualizarGrupoPlanDto,
  GrupoPlanSalidaDto,
  MoverPlanDto,
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
    private readonly pacientesDePlanUC: ObtenerPacientesDePlan,
    private readonly historialUC: ObtenerHistorialDePlanes,
    private readonly moverAGrupoUC: MoverPlanAGrupo,
    private readonly crearGrupoUC: CrearGrupoPlan,
    private readonly actualizarGrupoUC: ActualizarGrupoPlan,
    private readonly eliminarGrupoUC: EliminarGrupoPlan,
    private readonly obtenerGruposUC: ObtenerGruposPlan,
  ) {}

  async crearPlan(datos: CrearPlanDto): Promise<PlanSalidaDto> {
    const plan = await this.crearUC.ejecutar(datos);
    return ServicioPlan.aSalida(plan);
  }

  async obtenerPlanesPaginado(
    datos: ListarPlanesPaginadoDto,
  ): Promise<PlanesPaginados> {
    const { items, total, paginas } =
      await this.obtenerPaginadoUC.ejecutar(datos);
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

  async crearPlanDesdePlantilla(
    datos: CrearDesdePlantillaDto,
  ): Promise<PlanSalidaDto> {
    const plan = await this.desdePlantillaUC.ejecutar(datos);
    return ServicioPlan.aSalida(plan);
  }

  async asignarPlanAPaciente(datos: AsignarPlanDto): Promise<AsignacionPlan> {
    return this.asignarUC.ejecutar(datos);
  }

  async desasignarPlanDePaciente(pacienteId: string): Promise<void> {
    await this.desasignarUC.ejecutar(pacienteId);
  }

  async obtenerPlanDelPaciente(
    pacienteId: string,
  ): Promise<PlanSalidaDto | null> {
    const plan = await this.obtenerDelPacienteUC.ejecutar(pacienteId);
    return plan ? ServicioPlan.aSalida(plan) : null;
  }

  /**
   * DTO de salida. La lista cruda de archivos y el id del principal NO salen:
   * en su lugar van el principal ya RESUELTO y los adjuntos, que es lo que las
   * pantallas necesitan. Si saliera crudo, cada pantalla tendría que repetir el
   * fallback del principal y dos podrían mostrar archivos distintos del mismo
   * plan —el error que ya se cometió con la foto de la receta—.
   */
  /** Pacientes que tienen o tuvieron este plan, con sus fechas. */
  async obtenerPacientesDePlan(
    planId: string,
  ): Promise<AsignacionConPacienteDto[]> {
    return this.pacientesDePlanUC.ejecutar(planId);
  }

  /** Historial completo de planes del paciente, del más reciente al más viejo. */
  async obtenerHistorialDePlanes(
    pacienteId: string,
  ): Promise<AsignacionPlanSalidaDto[]> {
    return this.historialUC.ejecutar(pacienteId);
  }

  /** Mueve un plan a una carpeta (o lo saca de la que esté). */
  async moverPlanAGrupo(datos: MoverPlanDto): Promise<void> {
    await this.moverAGrupoUC.ejecutar(datos);
  }

  // --- Carpetas -------------------------------------------------------------

  async obtenerGrupos(): Promise<GrupoPlanSalidaDto[]> {
    const grupos = await this.obtenerGruposUC.ejecutar();
    return grupos.map(({ grupo, cantidadPlanes, cantidadPlantillas }) => ({
      ...grupo.aPrimitivos(),
      cantidadPlanes,
      cantidadPlantillas,
    }));
  }

  async crearGrupo(datos: GrupoPlanDto): Promise<GrupoPlanSalidaDto> {
    const grupo = await this.crearGrupoUC.ejecutar(datos);
    return { ...grupo.aPrimitivos(), cantidadPlanes: 0, cantidadPlantillas: 0 };
  }

  async actualizarGrupo(
    datos: ActualizarGrupoPlanDto,
  ): Promise<GrupoPlanSalidaDto> {
    const grupo = await this.actualizarGrupoUC.ejecutar(datos);
    // Los conteos no cambian al renombrar: la pantalla los refresca al invalidar.
    return { ...grupo.aPrimitivos(), cantidadPlanes: 0, cantidadPlantillas: 0 };
  }

  async eliminarGrupo(id: string): Promise<void> {
    await this.eliminarGrupoUC.ejecutar(id);
  }

  private static aSalida(plan: PlanNutricional): PlanSalidaDto {
    const { archivos, archivoPrincipalId, ...resto } = plan.aPrimitivos();
    void archivos;
    void archivoPrincipalId;
    return {
      ...resto,
      archivoPrincipal: plan.archivoPrincipal,
      adjuntos: [...plan.adjuntos],
    };
  }
}
