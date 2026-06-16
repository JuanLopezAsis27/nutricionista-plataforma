import type { CrearDieta } from "@/dominio/casos-de-uso/dietas/CrearDieta";
import type { ObtenerDietas } from "@/dominio/casos-de-uso/dietas/ObtenerDietas";
import type { ObtenerDietaPorId } from "@/dominio/casos-de-uso/dietas/ObtenerDietaPorId";
import type { ActualizarDieta } from "@/dominio/casos-de-uso/dietas/ActualizarDieta";
import type { EliminarDieta } from "@/dominio/casos-de-uso/dietas/EliminarDieta";
import type { AsignarDietaAPaciente } from "@/dominio/casos-de-uso/dietas/AsignarDietaAPaciente";
import type { ObtenerDietaDelPaciente } from "@/dominio/casos-de-uso/dietas/ObtenerDietaDelPaciente";
import type { Dieta } from "@/dominio/entidades/Dieta";
import type { AsignacionDieta } from "@/dominio/repositorios/IDietaRepositorio";
import type {
  CrearDietaDto,
  ActualizarDietaDto,
  AsignarDietaDto,
  DietaSalidaDto,
} from "../dtos/dieta.dto";

/**
 * Servicio de aplicación de Dietas.
 * Orquesta los casos de uso y devuelve DTOs de salida.
 */
export class ServicioDieta {
  constructor(
    private readonly crearUC: CrearDieta,
    private readonly obtenerTodasUC: ObtenerDietas,
    private readonly obtenerPorIdUC: ObtenerDietaPorId,
    private readonly actualizarUC: ActualizarDieta,
    private readonly eliminarUC: EliminarDieta,
    private readonly asignarUC: AsignarDietaAPaciente,
    private readonly obtenerDelPacienteUC: ObtenerDietaDelPaciente,
  ) {}

  async crearDieta(datos: CrearDietaDto): Promise<DietaSalidaDto> {
    const dieta = await this.crearUC.ejecutar(datos);
    return ServicioDieta.aSalida(dieta);
  }

  async obtenerDietas(): Promise<DietaSalidaDto[]> {
    const dietas = await this.obtenerTodasUC.ejecutar();
    return dietas.map(ServicioDieta.aSalida);
  }

  async obtenerDietaPorId(id: string): Promise<DietaSalidaDto> {
    const dieta = await this.obtenerPorIdUC.ejecutar(id);
    return ServicioDieta.aSalida(dieta);
  }

  async actualizarDieta(datos: ActualizarDietaDto): Promise<DietaSalidaDto> {
    const dieta = await this.actualizarUC.ejecutar(datos);
    return ServicioDieta.aSalida(dieta);
  }

  async eliminarDieta(id: string): Promise<void> {
    await this.eliminarUC.ejecutar(id);
  }

  async asignarDietaAPaciente(datos: AsignarDietaDto): Promise<AsignacionDieta> {
    return this.asignarUC.ejecutar(datos);
  }

  async obtenerDietaDelPaciente(pacienteId: string): Promise<DietaSalidaDto | null> {
    const dieta = await this.obtenerDelPacienteUC.ejecutar(pacienteId);
    return dieta ? ServicioDieta.aSalida(dieta) : null;
  }

  private static aSalida(dieta: Dieta): DietaSalidaDto {
    return dieta.aPrimitivos();
  }
}
