import type { CrearMaterial } from "@/dominio/casos-de-uso/biblioteca/CrearMaterial";
import type { ActualizarMaterial } from "@/dominio/casos-de-uso/biblioteca/ActualizarMaterial";
import type { EliminarMaterial } from "@/dominio/casos-de-uso/biblioteca/EliminarMaterial";
import type { ObtenerMateriales } from "@/dominio/casos-de-uso/biblioteca/ObtenerMateriales";
import type { AsignarMaterialAPaciente } from "@/dominio/casos-de-uso/biblioteca/AsignarMaterialAPaciente";
import type { DesasignarMaterialDePaciente } from "@/dominio/casos-de-uso/biblioteca/DesasignarMaterialDePaciente";
import type { ObtenerMaterialesDelPaciente } from "@/dominio/casos-de-uso/biblioteca/ObtenerMaterialesDelPaciente";
import type { ObtenerPacientesDeMaterial } from "@/dominio/casos-de-uso/biblioteca/ObtenerPacientesDeMaterial";
import type { MaterialBiblioteca } from "@/dominio/entidades/MaterialBiblioteca";
import type {
  CrearMaterialDto,
  ActualizarMaterialDto,
  FiltroMaterialesDto,
  AsignarMaterialDto,
  MaterialSalidaDto,
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
    private readonly asignarUC: AsignarMaterialAPaciente,
    private readonly desasignarUC: DesasignarMaterialDePaciente,
    private readonly obtenerDelPacienteUC: ObtenerMaterialesDelPaciente,
    private readonly obtenerPacientesUC: ObtenerPacientesDeMaterial,
  ) {}

  async crearMaterial(datos: CrearMaterialDto): Promise<MaterialSalidaDto> {
    const material = await this.crearUC.ejecutar(datos);
    return ServicioBiblioteca.aSalida(material);
  }

  async actualizarMaterial(datos: ActualizarMaterialDto): Promise<MaterialSalidaDto> {
    const material = await this.actualizarUC.ejecutar(datos);
    return ServicioBiblioteca.aSalida(material);
  }

  async eliminarMaterial(id: string): Promise<void> {
    await this.eliminarUC.ejecutar(id);
  }

  async obtenerMateriales(filtro?: FiltroMaterialesDto): Promise<MaterialSalidaDto[]> {
    const materiales = await this.obtenerTodosUC.ejecutar(filtro);
    return materiales.map(ServicioBiblioteca.aSalida);
  }

  async asignarMaterialAPaciente(datos: AsignarMaterialDto): Promise<void> {
    await this.asignarUC.ejecutar(datos);
  }

  async desasignarMaterialDePaciente(datos: AsignarMaterialDto): Promise<void> {
    await this.desasignarUC.ejecutar(datos);
  }

  async obtenerMaterialesDelPaciente(pacienteId: string): Promise<MaterialSalidaDto[]> {
    const materiales = await this.obtenerDelPacienteUC.ejecutar(pacienteId);
    return materiales.map(ServicioBiblioteca.aSalida);
  }

  async obtenerPacientesDeMaterial(materialId: string): Promise<string[]> {
    return this.obtenerPacientesUC.ejecutar(materialId);
  }

  private static aSalida(material: MaterialBiblioteca): MaterialSalidaDto {
    return material.aPrimitivos();
  }
}
