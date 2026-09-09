import type { ObtenerPerfilDeportivo } from "@/aplicacion/casos-de-uso/deportivo/ObtenerPerfilDeportivo";
import type { GuardarPerfilDeportivo } from "@/aplicacion/casos-de-uso/deportivo/GuardarPerfilDeportivo";
import type { ListarCompetencias } from "@/aplicacion/casos-de-uso/deportivo/ListarCompetencias";
import type { CrearCompetencia } from "@/aplicacion/casos-de-uso/deportivo/CrearCompetencia";
import type { ActualizarCompetencia } from "@/aplicacion/casos-de-uso/deportivo/ActualizarCompetencia";
import type { EliminarCompetencia } from "@/aplicacion/casos-de-uso/deportivo/EliminarCompetencia";
import type { PerfilDeportivo } from "@/dominio/entidades/PerfilDeportivo";
import type { Competencia } from "@/dominio/entidades/Competencia";
import type {
  GuardarPerfilDeportivoDto,
  PerfilDeportivoSalidaDto,
  CrearCompetenciaDto,
  ActualizarCompetenciaDto,
  CompetenciaSalidaDto,
} from "../dtos/deportivo.dto";

/**
 * Servicio de aplicación del módulo deportivo: perfil del deportista y su
 * calendario de competencias. Orquesta los casos de uso y devuelve DTOs.
 */
export class ServicioDeportivo {
  constructor(
    private readonly obtenerPerfilUC: ObtenerPerfilDeportivo,
    private readonly guardarPerfilUC: GuardarPerfilDeportivo,
    private readonly listarCompetenciasUC: ListarCompetencias,
    private readonly crearCompetenciaUC: CrearCompetencia,
    private readonly actualizarCompetenciaUC: ActualizarCompetencia,
    private readonly eliminarCompetenciaUC: EliminarCompetencia,
  ) {}

  async obtenerPerfil(
    pacienteId: string,
  ): Promise<PerfilDeportivoSalidaDto | null> {
    const perfil = await this.obtenerPerfilUC.ejecutar(pacienteId);
    return perfil ? ServicioDeportivo.perfilASalida(perfil) : null;
  }

  async guardarPerfil(
    datos: GuardarPerfilDeportivoDto,
  ): Promise<PerfilDeportivoSalidaDto> {
    return ServicioDeportivo.perfilASalida(
      await this.guardarPerfilUC.ejecutar(datos),
    );
  }

  async listarCompetencias(
    pacienteId: string,
  ): Promise<CompetenciaSalidaDto[]> {
    const competencias = await this.listarCompetenciasUC.ejecutar(pacienteId);
    return competencias.map(ServicioDeportivo.competenciaASalida);
  }

  async crearCompetencia(
    datos: CrearCompetenciaDto,
  ): Promise<CompetenciaSalidaDto> {
    return ServicioDeportivo.competenciaASalida(
      await this.crearCompetenciaUC.ejecutar(datos),
    );
  }

  async actualizarCompetencia(
    datos: ActualizarCompetenciaDto,
  ): Promise<CompetenciaSalidaDto> {
    return ServicioDeportivo.competenciaASalida(
      await this.actualizarCompetenciaUC.ejecutar(datos),
    );
  }

  async eliminarCompetencia(id: string): Promise<void> {
    await this.eliminarCompetenciaUC.ejecutar(id);
  }

  private static perfilASalida(
    perfil: PerfilDeportivo,
  ): PerfilDeportivoSalidaDto {
    return perfil.aPrimitivos();
  }

  private static competenciaASalida(
    competencia: Competencia,
  ): CompetenciaSalidaDto {
    return competencia.aPrimitivos();
  }
}
