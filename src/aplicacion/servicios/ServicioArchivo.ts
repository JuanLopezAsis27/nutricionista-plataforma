import type { SubirArchivo, DatosSubirArchivo } from "@/dominio/casos-de-uso/archivos/SubirArchivo";
import type { ObtenerUrlArchivo } from "@/dominio/casos-de-uso/archivos/ObtenerUrlArchivo";
import type { EliminarArchivo } from "@/dominio/casos-de-uso/archivos/EliminarArchivo";
import type { LimpiarArchivosHuerfanos, ResultadoLimpieza } from "@/dominio/casos-de-uso/archivos/LimpiarArchivosHuerfanos";
import type { ObtenerArchivosDeDueno } from "@/dominio/casos-de-uso/archivos/ObtenerArchivosDeDueno";
import type {
  PuedeVerArchivoPaciente,
  SolicitanteArchivo,
} from "@/dominio/casos-de-uso/archivos/PuedeVerArchivoPaciente";
import type { Archivo } from "@/dominio/entidades/Archivo";
import type { ArchivoSalidaDto } from "../dtos/archivo.dto";

/** Archivo con URL firmada de lectura temporal. */
export interface ArchivoConUrlDto {
  archivo: ArchivoSalidaDto;
  url: string;
}

/**
 * Servicio de aplicación de Archivos.
 * Orquesta los casos de uso y devuelve DTOs de salida.
 */
export class ServicioArchivo {
  constructor(
    private readonly subirUC: SubirArchivo,
    private readonly obtenerUrlUC: ObtenerUrlArchivo,
    private readonly eliminarUC: EliminarArchivo,
    private readonly limpiarHuerfanosUC: LimpiarArchivosHuerfanos,
    private readonly obtenerDeDuenoUC: ObtenerArchivosDeDueno,
    private readonly puedeVerPacienteUC: PuedeVerArchivoPaciente,
  ) {}

  async subir(datos: DatosSubirArchivo): Promise<ArchivoSalidaDto> {
    const archivo = await this.subirUC.ejecutar(datos);
    return ServicioArchivo.aSalida(archivo);
  }

  async obtenerUrl(id: string, expiraEnSegundos = 60): Promise<ArchivoConUrlDto> {
    const { archivo, url } = await this.obtenerUrlUC.ejecutar(id, expiraEnSegundos);
    return { archivo: ServicioArchivo.aSalida(archivo), url };
  }

  async eliminar(id: string): Promise<void> {
    await this.eliminarUC.ejecutar(id);
  }

  async limpiarHuerfanos(): Promise<ResultadoLimpieza> {
    return this.limpiarHuerfanosUC.ejecutar();
  }

  /** ¿Puede un usuario PACIENTE ver este archivo? (el nutricionista ve todo) */
  async puedeVerPaciente(archivoId: string, solicitante: SolicitanteArchivo): Promise<boolean> {
    return this.puedeVerPacienteUC.ejecutar(archivoId, solicitante);
  }

  async listarDePaciente(pacienteId: string): Promise<ArchivoSalidaDto[]> {
    const archivos = await this.obtenerDeDuenoUC.ejecutar({ pacienteId });
    return archivos.map(ServicioArchivo.aSalida);
  }

  private static aSalida(archivo: Archivo): ArchivoSalidaDto {
    return archivo.aPrimitivos();
  }
}
