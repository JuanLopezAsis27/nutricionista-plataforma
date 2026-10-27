import type { ListarDeportes } from "@/aplicacion/casos-de-uso/deportes/ListarDeportes";
import type { CrearDeporte } from "@/aplicacion/casos-de-uso/deportes/CrearDeporte";
import type { RenombrarDeporte } from "@/aplicacion/casos-de-uso/deportes/RenombrarDeporte";
import type { EliminarDeporte } from "@/aplicacion/casos-de-uso/deportes/EliminarDeporte";
import type { CambiarPlanificacionDeDeporte } from "@/aplicacion/casos-de-uso/deportes/CambiarPlanificacionDeDeporte";
import type { FormatoPlanificacion } from "@/dominio/entidades/PlanificacionDeportiva";
import type { DeporteSalidaDto } from "../dtos/deporte.dto";

/**
 * Servicio de aplicación de la lista de deportes de la plataforma (migración
 * 97). Listar lo usan todos los consultorios (el buscador del perfil
 * deportivo); crear, renombrar y borrar, solo el SUPERADMIN —lo decide el
 * router, que es el que sabe el rol—.
 */
export class ServicioDeportes {
  constructor(
    private readonly listarUC: ListarDeportes,
    private readonly crearUC: CrearDeporte,
    private readonly renombrarUC: RenombrarDeporte,
    private readonly eliminarUC: EliminarDeporte,
    private readonly cambiarPlanificacionUC: CambiarPlanificacionDeDeporte,
  ) {}

  async listar(): Promise<DeporteSalidaDto[]> {
    return (await this.listarUC.ejecutar()).map((d) => d.referencia);
  }

  async crear(nombre: string): Promise<DeporteSalidaDto> {
    return (await this.crearUC.ejecutar(nombre)).referencia;
  }

  async renombrar(id: string, nombre: string): Promise<DeporteSalidaDto> {
    return (await this.renombrarUC.ejecutar(id, nombre)).referencia;
  }

  eliminar(id: string): Promise<void> {
    return this.eliminarUC.ejecutar(id);
  }

  async cambiarPlanificacion(
    id: string,
    formato: FormatoPlanificacion | null,
  ): Promise<DeporteSalidaDto> {
    return (await this.cambiarPlanificacionUC.ejecutar(id, formato))
      .referencia;
  }
}
