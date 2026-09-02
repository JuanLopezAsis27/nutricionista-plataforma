import type { CrearPaciente } from "@/aplicacion/casos-de-uso/pacientes/CrearPaciente";
import type { ObtenerPacientes } from "@/aplicacion/casos-de-uso/pacientes/ObtenerPacientes";
import type { ObtenerPacientePorId } from "@/aplicacion/casos-de-uso/pacientes/ObtenerPacientePorId";
import type { ActualizarPaciente } from "@/aplicacion/casos-de-uso/pacientes/ActualizarPaciente";
import type { EliminarPaciente } from "@/aplicacion/casos-de-uso/pacientes/EliminarPaciente";
import type { EnviarEmailDeBienvenida } from "@/aplicacion/casos-de-uso/pacientes/EnviarEmailDeBienvenida";
import type { ArchivarPaciente } from "@/aplicacion/casos-de-uso/pacientes/ArchivarPaciente";
import type { ReactivarPaciente } from "@/aplicacion/casos-de-uso/pacientes/ReactivarPaciente";
import type { InterpretarFichaPaciente } from "@/aplicacion/casos-de-uso/pacientes/InterpretarFichaPaciente";
import type { CrearPacienteDesdeFicha } from "@/aplicacion/casos-de-uso/pacientes/CrearPacienteDesdeFicha";
import type { Paciente } from "@/dominio/entidades/Paciente";
import type {
  CrearPacienteConAccesoDto,
  ActualizarPacienteDto,
  ListarPacientesDto,
  PacienteSalidaDto,
  PacientesPaginados,
  InterpretarFichaPacienteDto,
  FichaPacienteSugeridaDto,
  CrearPacienteDesdeFichaDto,
  AltaDesdeFichaSalidaDto,
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
    private readonly archivarUC: ArchivarPaciente,
    private readonly reactivarUC: ReactivarPaciente,
    private readonly interpretarFichaUC: InterpretarFichaPaciente,
    private readonly crearDesdeFichaUC: CrearPacienteDesdeFicha,
  ) {}

  async crearPaciente(
    datos: CrearPacienteConAccesoDto,
  ): Promise<PacienteSalidaDto> {
    const paciente = await this.crearUC.ejecutar(datos);
    // Email de bienvenida best-effort: nunca hace fallar el alta del paciente.
    try {
      await this.enviarBienvenidaUC.ejecutar(
        paciente.nombreCompleto,
        paciente.email,
      );
    } catch (error) {
      console.error(
        "[bienvenida] no se pudo enviar el email de bienvenida:",
        error,
      );
    }
    return ServicioPaciente.aSalida(paciente);
  }

  async obtenerPacientes(
    datos: ListarPacientesDto,
  ): Promise<PacientesPaginados> {
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

  async actualizarPaciente(
    datos: ActualizarPacienteDto,
  ): Promise<PacienteSalidaDto> {
    const paciente = await this.actualizarUC.ejecutar(datos);
    return ServicioPaciente.aSalida(paciente);
  }

  async eliminarPaciente(id: string): Promise<void> {
    await this.eliminarUC.ejecutar(id);
  }

  async archivarPaciente(
    id: string,
    motivo: string | null,
  ): Promise<PacienteSalidaDto> {
    return ServicioPaciente.aSalida(await this.archivarUC.ejecutar(id, motivo));
  }

  async reactivarPaciente(id: string): Promise<PacienteSalidaDto> {
    return ServicioPaciente.aSalida(await this.reactivarUC.ejecutar(id));
  }

  /**
   * Lee la ficha subida y devuelve lo que la IA reconoció. No persiste nada:
   * el formulario de alta se precarga y el profesional confirma.
   */
  async interpretarFicha(
    datos: InterpretarFichaPacienteDto,
  ): Promise<FichaPacienteSugeridaDto> {
    const ficha = await this.interpretarFichaUC.ejecutar(datos);
    const { historiaClinica } = ficha;
    return {
      ...ficha,
      // El puerto devuelve un Partial (un campo ausente es `undefined`); el
      // DTO de salida pide null explícito para que el formulario del cliente
      // reciba siempre las siete claves.
      historiaClinica: {
        motivoConsulta: historiaClinica.motivoConsulta ?? null,
        diagnosticos: historiaClinica.diagnosticos ?? null,
        medicacion: historiaClinica.medicacion ?? null,
        antecedentesPersonales: historiaClinica.antecedentesPersonales ?? null,
        antecedentesFamiliares: historiaClinica.antecedentesFamiliares ?? null,
        habitos: historiaClinica.habitos ?? null,
        contexto: historiaClinica.contexto ?? null,
      },
    };
  }

  /** Alta confirmada desde una ficha, con sus registros asociados. */
  async crearPacienteDesdeFicha(
    datos: CrearPacienteDesdeFichaDto,
  ): Promise<AltaDesdeFichaSalidaDto> {
    const { paciente, advertencias } = await this.crearDesdeFichaUC.ejecutar({
      ...datos,
      antropometria: datos.antropometria
        ? {
            ...datos.antropometria,
            // La fecha llega como ISO `YYYY-MM-DD` (o falta): la medición se
            // fecha hoy si el documento no decía cuándo se tomó.
            fecha: datos.antropometria.fecha
              ? new Date(`${datos.antropometria.fecha}T00:00:00.000Z`)
              : new Date(),
          }
        : null,
      laboratorios: datos.laboratorios.map((laboratorio) => ({
        ...laboratorio,
        fecha: laboratorio.fecha
          ? new Date(`${laboratorio.fecha}T00:00:00.000Z`)
          : new Date(),
      })),
    });

    // El email de bienvenida lo manda `crearPaciente`; acá no, porque el alta
    // desde ficha suele hacerse con el paciente sentado enfrente.
    return { paciente: ServicioPaciente.aSalida(paciente), advertencias };
  }

  /** Mapea la entidad de dominio al DTO de salida. */
  private static aSalida(paciente: Paciente): PacienteSalidaDto {
    return paciente.aPrimitivos();
  }
}
