import type { CrearObjetivo } from "@/dominio/casos-de-uso/objetivos/CrearObjetivo";
import type { ActualizarObjetivo } from "@/dominio/casos-de-uso/objetivos/ActualizarObjetivo";
import type { CambiarEstadoObjetivo } from "@/dominio/casos-de-uso/objetivos/CambiarEstadoObjetivo";
import type { EliminarObjetivo } from "@/dominio/casos-de-uso/objetivos/EliminarObjetivo";
import type { ObtenerObjetivosDePaciente } from "@/dominio/casos-de-uso/objetivos/ObtenerObjetivosDePaciente";
import type { AgregarEstrategia } from "@/dominio/casos-de-uso/objetivos/AgregarEstrategia";
import type { CambiarEstadoEstrategia } from "@/dominio/casos-de-uso/objetivos/CambiarEstadoEstrategia";
import type { EliminarEstrategia } from "@/dominio/casos-de-uso/objetivos/EliminarEstrategia";
import type { ObtenerHistorialObjetivo } from "@/dominio/casos-de-uso/objetivos/ObtenerHistorialObjetivo";
import type { Objetivo } from "@/dominio/entidades/Objetivo";
import type {
  CrearObjetivoDto,
  ActualizarObjetivoDto,
  CambiarEstadoObjetivoDto,
  AgregarEstrategiaDto,
  CambiarEstadoEstrategiaDto,
  EliminarEstrategiaDto,
  ObjetivoSalidaDto,
  EventoObjetivoSalidaDto,
} from "../dtos/objetivo.dto";

/**
 * Servicio de aplicación de Objetivos.
 * Orquesta los casos de uso y devuelve DTOs de salida.
 */
export class ServicioObjetivo {
  constructor(
    private readonly crearUC: CrearObjetivo,
    private readonly actualizarUC: ActualizarObjetivo,
    private readonly cambiarEstadoUC: CambiarEstadoObjetivo,
    private readonly eliminarUC: EliminarObjetivo,
    private readonly obtenerDePacienteUC: ObtenerObjetivosDePaciente,
    private readonly agregarEstrategiaUC: AgregarEstrategia,
    private readonly cambiarEstadoEstrategiaUC: CambiarEstadoEstrategia,
    private readonly eliminarEstrategiaUC: EliminarEstrategia,
    private readonly obtenerHistorialUC: ObtenerHistorialObjetivo,
  ) {}

  async crearObjetivo(datos: CrearObjetivoDto): Promise<ObjetivoSalidaDto> {
    const objetivo = await this.crearUC.ejecutar(datos);
    return ServicioObjetivo.aSalida(objetivo);
  }

  async actualizarObjetivo(datos: ActualizarObjetivoDto): Promise<ObjetivoSalidaDto> {
    const objetivo = await this.actualizarUC.ejecutar(datos);
    return ServicioObjetivo.aSalida(objetivo);
  }

  async cambiarEstadoObjetivo(datos: CambiarEstadoObjetivoDto): Promise<ObjetivoSalidaDto> {
    const objetivo = await this.cambiarEstadoUC.ejecutar(datos);
    return ServicioObjetivo.aSalida(objetivo);
  }

  async eliminarObjetivo(id: string): Promise<void> {
    await this.eliminarUC.ejecutar(id);
  }

  async obtenerObjetivosDePaciente(pacienteId: string): Promise<ObjetivoSalidaDto[]> {
    const objetivos = await this.obtenerDePacienteUC.ejecutar(pacienteId);
    return objetivos.map(ServicioObjetivo.aSalida);
  }

  async agregarEstrategia(datos: AgregarEstrategiaDto): Promise<void> {
    await this.agregarEstrategiaUC.ejecutar(datos);
  }

  async cambiarEstadoEstrategia(datos: CambiarEstadoEstrategiaDto): Promise<void> {
    await this.cambiarEstadoEstrategiaUC.ejecutar(datos);
  }

  async eliminarEstrategia(datos: EliminarEstrategiaDto): Promise<void> {
    await this.eliminarEstrategiaUC.ejecutar(datos);
  }

  async obtenerHistorial(objetivoId: string): Promise<EventoObjetivoSalidaDto[]> {
    return this.obtenerHistorialUC.ejecutar(objetivoId);
  }

  private static aSalida(objetivo: Objetivo): ObjetivoSalidaDto {
    return objetivo.aPrimitivos();
  }
}
