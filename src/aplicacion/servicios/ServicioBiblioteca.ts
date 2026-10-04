import type { CrearMaterial } from "@/aplicacion/casos-de-uso/biblioteca/CrearMaterial";
import type { ActualizarMaterial } from "@/aplicacion/casos-de-uso/biblioteca/ActualizarMaterial";
import type { EliminarMaterial } from "@/aplicacion/casos-de-uso/biblioteca/EliminarMaterial";
import type { ObtenerMateriales } from "@/aplicacion/casos-de-uso/biblioteca/ObtenerMateriales";
import type { ObtenerMaterialesPaginado } from "@/aplicacion/casos-de-uso/biblioteca/ObtenerMaterialesPaginado";
import type { AsignarMaterialAPaciente } from "@/aplicacion/casos-de-uso/biblioteca/AsignarMaterialAPaciente";
import type { DesasignarMaterialDePaciente } from "@/aplicacion/casos-de-uso/biblioteca/DesasignarMaterialDePaciente";
import type { ObtenerMaterialesDelPaciente } from "@/aplicacion/casos-de-uso/biblioteca/ObtenerMaterialesDelPaciente";
import type {
  ObtenerPacientesDeMaterial,
  PacienteAsignado,
} from "@/aplicacion/casos-de-uso/biblioteca/ObtenerPacientesDeMaterial";
import type { CompartirMaterialConTodos } from "@/aplicacion/casos-de-uso/biblioteca/CompartirMaterialConTodos";
import type { MoverMaterialAGrupo } from "@/aplicacion/casos-de-uso/biblioteca/MoverMaterialAGrupo";
import type { CrearGrupoMaterial } from "@/aplicacion/casos-de-uso/grupos-material/CrearGrupoMaterial";
import type { ActualizarGrupoMaterial } from "@/aplicacion/casos-de-uso/grupos-material/ActualizarGrupoMaterial";
import type { EliminarGrupoMaterial } from "@/aplicacion/casos-de-uso/grupos-material/EliminarGrupoMaterial";
import type { ObtenerGruposMaterial } from "@/aplicacion/casos-de-uso/grupos-material/ObtenerGruposMaterial";
import type { MaterialBiblioteca } from "@/dominio/entidades/MaterialBiblioteca";
import type {
  CrearMaterialDto,
  ActualizarMaterialDto,
  FiltroMaterialesDto,
  ListarMaterialesPaginadoDto,
  MaterialesPaginados,
  AsignarMaterialDto,
  MaterialSalidaDto,
  MoverMaterialDto,
  GrupoMaterialDto,
  ActualizarGrupoMaterialDto,
  GrupoMaterialSalidaDto,
} from "../dtos/material.dto";

/**
 * Servicio de aplicación de la Biblioteca.
 * Orquesta los casos de uso y devuelve DTOs de salida.
 */
export class ServicioBiblioteca {
  constructor(
    private readonly crearUC: CrearMaterial,
    private readonly actualizarUC: ActualizarMaterial,
    private readonly eliminarUC: EliminarMaterial,
    private readonly obtenerTodosUC: ObtenerMateriales,
    private readonly obtenerPaginadoUC: ObtenerMaterialesPaginado,
    private readonly asignarUC: AsignarMaterialAPaciente,
    private readonly desasignarUC: DesasignarMaterialDePaciente,
    private readonly obtenerDelPacienteUC: ObtenerMaterialesDelPaciente,
    private readonly obtenerPacientesUC: ObtenerPacientesDeMaterial,
    private readonly compartirConTodosUC: CompartirMaterialConTodos,
    private readonly moverAGrupoUC: MoverMaterialAGrupo,
    private readonly crearGrupoUC: CrearGrupoMaterial,
    private readonly actualizarGrupoUC: ActualizarGrupoMaterial,
    private readonly eliminarGrupoUC: EliminarGrupoMaterial,
    private readonly obtenerGruposUC: ObtenerGruposMaterial,
  ) {}

  async crearMaterial(datos: CrearMaterialDto): Promise<MaterialSalidaDto> {
    const material = await this.crearUC.ejecutar(datos);
    return ServicioBiblioteca.aSalida(material);
  }

  async actualizarMaterial(
    datos: ActualizarMaterialDto,
  ): Promise<MaterialSalidaDto> {
    const material = await this.actualizarUC.ejecutar(datos);
    return ServicioBiblioteca.aSalida(material);
  }

  async eliminarMaterial(id: string): Promise<void> {
    await this.eliminarUC.ejecutar(id);
  }

  async obtenerMateriales(
    filtro?: FiltroMaterialesDto,
  ): Promise<MaterialSalidaDto[]> {
    const materiales = await this.obtenerTodosUC.ejecutar(filtro);
    return materiales.map(ServicioBiblioteca.aSalida);
  }

  /** Biblioteca paginada (trae solo la página pedida). */
  async obtenerMaterialesPaginado(
    datos: ListarMaterialesPaginadoDto,
  ): Promise<MaterialesPaginados> {
    const { items, total, paginas } =
      await this.obtenerPaginadoUC.ejecutar(datos);
    return {
      materiales: items.map(ServicioBiblioteca.aSalida),
      total,
      paginas,
    };
  }

  async asignarMaterialAPaciente(datos: AsignarMaterialDto): Promise<void> {
    await this.asignarUC.ejecutar(datos);
  }

  async desasignarMaterialDePaciente(datos: AsignarMaterialDto): Promise<void> {
    await this.desasignarUC.ejecutar(datos);
  }

  async obtenerMaterialesDelPaciente(
    pacienteId: string,
  ): Promise<MaterialSalidaDto[]> {
    const materiales = await this.obtenerDelPacienteUC.ejecutar(pacienteId);
    return materiales.map(ServicioBiblioteca.aSalida);
  }

  /** Comparte el material con todos los pacientes vigentes del consultorio. */
  async compartirMaterialConTodos(
    materialId: string,
  ): Promise<{ nuevos: number; pacientes: number }> {
    return this.compartirConTodosUC.ejecutar(materialId);
  }

  async obtenerPacientesDeMaterial(
    materialId: string,
  ): Promise<PacienteAsignado[]> {
    return this.obtenerPacientesUC.ejecutar(materialId);
  }

  // --- Carpetas de la biblioteca ---

  /** Mueve un material a una carpeta, o lo saca (grupoId null). */
  async moverMaterialAGrupo(datos: MoverMaterialDto): Promise<void> {
    await this.moverAGrupoUC.ejecutar(datos);
  }

  async obtenerGrupos(): Promise<GrupoMaterialSalidaDto[]> {
    const grupos = await this.obtenerGruposUC.ejecutar();
    return grupos.map(({ grupo, cantidadMateriales }) => ({
      ...grupo.aPrimitivos(),
      cantidadMateriales,
    }));
  }

  async crearGrupo(datos: GrupoMaterialDto): Promise<GrupoMaterialSalidaDto> {
    const grupo = await this.crearGrupoUC.ejecutar(datos);
    // Recién creada: vacía por definición, no hace falta ir a contarla.
    return { ...grupo.aPrimitivos(), cantidadMateriales: 0 };
  }

  async actualizarGrupo(
    datos: ActualizarGrupoMaterialDto,
  ): Promise<GrupoMaterialSalidaDto> {
    const grupo = await this.actualizarGrupoUC.ejecutar(datos);
    // El total lo repone el listado, que se invalida junto con la mutación.
    return { ...grupo.aPrimitivos(), cantidadMateriales: 0 };
  }

  async eliminarGrupo(id: string): Promise<void> {
    await this.eliminarGrupoUC.ejecutar(id);
  }

  private static aSalida(material: MaterialBiblioteca): MaterialSalidaDto {
    return material.aPrimitivos();
  }
}
