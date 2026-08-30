import type { CrearReceta } from "@/aplicacion/casos-de-uso/recetas/CrearReceta";
import type { ObtenerRecetas } from "@/aplicacion/casos-de-uso/recetas/ObtenerRecetas";
import type { ObtenerRecetasPaginado } from "@/aplicacion/casos-de-uso/recetas/ObtenerRecetasPaginado";
import type { ObtenerRecetaPorId } from "@/aplicacion/casos-de-uso/recetas/ObtenerRecetaPorId";
import type { ActualizarReceta } from "@/aplicacion/casos-de-uso/recetas/ActualizarReceta";
import type { EliminarReceta } from "@/aplicacion/casos-de-uso/recetas/EliminarReceta";
import type { EliminarArchivoDeReceta } from "@/aplicacion/casos-de-uso/recetas/EliminarArchivoDeReceta";
import type { MarcarFotoPrincipal } from "@/aplicacion/casos-de-uso/recetas/MarcarFotoPrincipal";
import type { AsignarRecetaAPaciente } from "@/aplicacion/casos-de-uso/recetas/AsignarRecetaAPaciente";
import type { DesasignarRecetaDePaciente } from "@/aplicacion/casos-de-uso/recetas/DesasignarRecetaDePaciente";
import type { ObtenerRecetasDelPaciente } from "@/aplicacion/casos-de-uso/recetas/ObtenerRecetasDelPaciente";
import type { ObtenerPacientesDeReceta } from "@/aplicacion/casos-de-uso/recetas/ObtenerPacientesDeReceta";
import type { Receta } from "@/dominio/entidades/Receta";
import type {
  CrearRecetaDto,
  ActualizarRecetaDto,
  FiltroRecetasDto,
  ListarRecetasPaginadoDto,
  RecetasPaginadas,
  AsignarRecetaDto,
  RecetaSalidaDto,
} from "../dtos/receta.dto";

/**
 * Servicio de aplicación del Recetario.
 * Orquesta los casos de uso y devuelve DTOs de salida.
 */
export class ServicioReceta {
  constructor(
    private readonly crearUC: CrearReceta,
    private readonly obtenerTodasUC: ObtenerRecetas,
    private readonly obtenerPaginadoUC: ObtenerRecetasPaginado,
    private readonly obtenerPorIdUC: ObtenerRecetaPorId,
    private readonly actualizarUC: ActualizarReceta,
    private readonly eliminarUC: EliminarReceta,
    private readonly eliminarArchivoUC: EliminarArchivoDeReceta,
    private readonly marcarFotoPrincipalUC: MarcarFotoPrincipal,
    private readonly asignarUC: AsignarRecetaAPaciente,
    private readonly desasignarUC: DesasignarRecetaDePaciente,
    private readonly obtenerDelPacienteUC: ObtenerRecetasDelPaciente,
    private readonly obtenerPacientesUC: ObtenerPacientesDeReceta,
  ) {}

  async crearReceta(datos: CrearRecetaDto): Promise<RecetaSalidaDto> {
    const receta = await this.crearUC.ejecutar(datos);
    return ServicioReceta.aSalida(receta);
  }

  async obtenerRecetas(filtro?: FiltroRecetasDto): Promise<RecetaSalidaDto[]> {
    const recetas = await this.obtenerTodasUC.ejecutar(filtro);
    return recetas.map(ServicioReceta.aSalida);
  }

  /** Recetario paginado (trae solo la página pedida). */
  async obtenerRecetasPaginado(
    datos: ListarRecetasPaginadoDto,
  ): Promise<RecetasPaginadas> {
    const { items, total, paginas } =
      await this.obtenerPaginadoUC.ejecutar(datos);
    return { recetas: items.map(ServicioReceta.aSalida), total, paginas };
  }

  async obtenerRecetaPorId(id: string): Promise<RecetaSalidaDto> {
    const receta = await this.obtenerPorIdUC.ejecutar(id);
    return ServicioReceta.aSalida(receta);
  }

  async actualizarReceta(datos: ActualizarRecetaDto): Promise<RecetaSalidaDto> {
    const receta = await this.actualizarUC.ejecutar(datos);
    return ServicioReceta.aSalida(receta);
  }

  /** Borra una foto o un documento adjunto y devuelve la receta ya sin él. */
  async eliminarArchivoDeReceta(
    recetaId: string,
    archivoId: string,
  ): Promise<RecetaSalidaDto> {
    return ServicioReceta.aSalida(
      await this.eliminarArchivoUC.ejecutar(recetaId, archivoId),
    );
  }

  /** Elige la foto que representa la receta (null = la primera disponible). */
  async marcarFotoPrincipal(
    recetaId: string,
    fotoId: string | null,
  ): Promise<RecetaSalidaDto> {
    return ServicioReceta.aSalida(
      await this.marcarFotoPrincipalUC.ejecutar(recetaId, fotoId),
    );
  }

  async eliminarReceta(id: string): Promise<void> {
    await this.eliminarUC.ejecutar(id);
  }

  async asignarRecetaAPaciente(datos: AsignarRecetaDto): Promise<void> {
    await this.asignarUC.ejecutar(datos);
  }

  async desasignarRecetaDePaciente(datos: AsignarRecetaDto): Promise<void> {
    await this.desasignarUC.ejecutar(datos);
  }

  async obtenerRecetasDelPaciente(
    pacienteId: string,
  ): Promise<RecetaSalidaDto[]> {
    const recetas = await this.obtenerDelPacienteUC.ejecutar(pacienteId);
    return recetas.map(ServicioReceta.aSalida);
  }

  async obtenerPacientesDeReceta(recetaId: string): Promise<string[]> {
    return this.obtenerPacientesUC.ejecutar(recetaId);
  }

  private static aSalida(receta: Receta): RecetaSalidaDto {
    return {
      ...receta.aPrimitivos(),
      totales: receta.totales(),
      macrosCalculados: receta.macrosCalculados,
    };
  }
}
