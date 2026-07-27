import type { CrearPaciente } from "@/dominio/casos-de-uso/pacientes/CrearPaciente";
import type { ObtenerPacientes } from "@/dominio/casos-de-uso/pacientes/ObtenerPacientes";
import type { ObtenerPacientePorId } from "@/dominio/casos-de-uso/pacientes/ObtenerPacientePorId";
import type { ActualizarPaciente } from "@/dominio/casos-de-uso/pacientes/ActualizarPaciente";
import type { EliminarPaciente } from "@/dominio/casos-de-uso/pacientes/EliminarPaciente";
import type { EnviarEmailDeBienvenida } from "@/dominio/casos-de-uso/pacientes/EnviarEmailDeBienvenida";
import type { Paciente } from "@/dominio/entidades/Paciente";
import type {
  CrearPacienteConAccesoDto,
  ActualizarPacienteDto,
  ListarPacientesDto,
  PacienteSalidaDto,
  PacientesPaginados,
} from "../dtos/paciente.dto";

/**
 * Servicio de aplicación de Pacientes.
 *
 * Orquesta los casos de uso (inyectados por constructor, DIP) y traduce entre
 * los DTOs de la presentación y las entidades del dominio. Devuelve siempre
 * DTOs de salida (objetos planos serializables), nunca entidades.
 */
export class ServicioPaciente {
  constructor(
    private readonly crearUC: CrearPaciente,
    private readonly obtenerTodosUC: ObtenerPacientes,
    private readonly obtenerPorIdUC: ObtenerPacientePorId,
    private readonly actualizarUC: ActualizarPaciente,
    private readonly eliminarUC: EliminarPaciente,
    private readonly enviarBienvenidaUC: EnviarEmailDeBienvenida,
  ) {}

  async crearPaciente(datos: CrearPacienteConAccesoDto): Promise<PacienteSalidaDto> {
    const paciente = await this.crearUC.ejecutar(datos);
    // Email de bienvenida best-effort: nunca hace fallar el alta del paciente.
    try {
      await this.enviarBienvenidaUC.ejecutar(paciente.nombreCompleto, paciente.email);
    } catch (error) {
      console.error("[bienvenida] no se pudo enviar el email de bienvenida:", error);
    }
    return ServicioPaciente.aSalida(paciente);
  }

  async obtenerPacientes(datos: ListarPacientesDto): Promise<PacientesPaginados> {
    const resultado = await this.obtenerTodosUC.ejecutar(datos);
    return {
      pacientes: resultado.pacientes.map(ServicioPaciente.aSalida),
      total: resultado.total,
      paginas: resultado.paginas,
    };
  }

  async obtenerPacientePorId(id: string): Promise<PacienteSalidaDto> {
    const paciente = await this.obtenerPorIdUC.ejecutar(id);
    return ServicioPaciente.aSalida(paciente);
  }

  async actualizarPaciente(datos: ActualizarPacienteDto): Promise<PacienteSalidaDto> {
    const paciente = await this.actualizarUC.ejecutar(datos);
    return ServicioPaciente.aSalida(paciente);
  }

  async eliminarPaciente(id: string): Promise<void> {
    await this.eliminarUC.ejecutar(id);
  }

  /** Mapea la entidad de dominio al DTO de salida. */
  private static aSalida(paciente: Paciente): PacienteSalidaDto {
    return paciente.aPrimitivos();
  }
}
