import type { CrearPaciente } from "@/aplicacion/casos-de-uso/pacientes/CrearPaciente";
import type { ObtenerPacientes } from "@/aplicacion/casos-de-uso/pacientes/ObtenerPacientes";
import type { ObtenerPacientePorId } from "@/aplicacion/casos-de-uso/pacientes/ObtenerPacientePorId";
import type { ActualizarPaciente } from "@/aplicacion/casos-de-uso/pacientes/ActualizarPaciente";
import type { EliminarPaciente } from "@/aplicacion/casos-de-uso/pacientes/EliminarPaciente";
import type { EnviarBienvenidaAlAlta } from "@/aplicacion/casos-de-uso/pacientes/EnviarBienvenidaAlAlta";
import type {
  EnviarBienvenidaMasiva,
  ResultadoEnvioBienvenida,
  ContrasenaBienvenida,
} from "@/aplicacion/casos-de-uso/pacientes/EnviarBienvenidaMasiva";
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
  AltaPacienteSalidaDto,
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
    private readonly enviarBienvenidaUC: EnviarBienvenidaAlAlta,
    private readonly enviarBienvenidaMasivaUC: EnviarBienvenidaMasiva,
    private readonly archivarUC: ArchivarPaciente,
    private readonly reactivarUC: ReactivarPaciente,
    private readonly interpretarFichaUC: InterpretarFichaPaciente,
    private readonly crearDesdeFichaUC: CrearPacienteDesdeFicha,
  ) {}

  async crearPaciente(
    datos: CrearPacienteConAccesoDto,
  ): Promise<AltaPacienteSalidaDto> {
    const { paciente, cuentaExistente } = await this.crearUC.ejecutar(datos);
    await this.darLaBienvenida(paciente, datos.password, cuentaExistente);
    return { ...ServicioPaciente.aSalida(paciente), cuentaExistente };
  }

  /**
   * El email de bienvenida del alta, con la MISMA política para los dos
   * caminos que crean un paciente (el formulario y la ficha en documento).
   *
   * Está en un método propio justamente por eso: mientras cada alta decidía por
   * su cuenta, la que venía de un documento no mandaba nada, y el paciente se
   * quedaba sin sus datos de acceso sin que nadie se enterara —el alta decía
   * "creado" igual—. Quién recibe la bienvenida no puede depender de por qué
   * pantalla entró el profesional.
   *
   * Es best-effort y nunca hace fallar el alta: el paciente ya está creado y su
   * ficha no se puede perder porque el SMTP esté caído. Si no salió, queda el
   * envío manual desde el listado.
   *
   * El interruptor del consultorio (`bienvenidaAutomaticaActiva`) lo respeta
   * `EnviarBienvenidaAlAlta`, así que apagarlo sigue apagando las dos vías.
   */
  private async darLaBienvenida(
    paciente: Paciente,
    contrasena: string,
    cuentaExistente: boolean,
  ): Promise<void> {
    try {
      await this.enviarBienvenidaUC.ejecutar({
        paciente,
        // La contraseña en texto plano solo existe acá, durante el alta: la
        // cuenta ya la guardó hasheada. Por eso la bienvenida es el único
        // mensaje que puede llevarla.
        contrasena,
        // Ya tenía cuenta: otra plantilla, sin contraseña (la suya no se
        // tocó, y la que se cargó en el alta no es la de su cuenta).
        cuentaExistente,
      });
    } catch (error) {
      console.error(
        "[bienvenida] no se pudo enviar el email de bienvenida:",
        error,
      );
    }
  }

  /** Envío manual de la bienvenida a una selección de pacientes. */
  async enviarBienvenidaManual(datos: {
    pacienteIds: string[];
    forzar?: boolean;
    contrasena?: ContrasenaBienvenida;
  }): Promise<ResultadoEnvioBienvenida> {
    return this.enviarBienvenidaMasivaUC.ejecutar(datos);
  }

  /**
   * Si la bienvenida lleva `{{contrasena}}`: la pantalla pregunta de dónde
   * sale la contraseña solo cuando va a viajar en el email.
   */
  async bienvenidaPideContrasena(): Promise<boolean> {
    return this.enviarBienvenidaMasivaUC.pideContrasena();
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
      // reciba siempre todas las claves.
      historiaClinica: {
        motivoConsulta: historiaClinica.motivoConsulta ?? null,
        diagnosticos: historiaClinica.diagnosticos ?? null,
        medicacion: historiaClinica.medicacion ?? null,
        alergiasIntolerancias: historiaClinica.alergiasIntolerancias ?? null,
        antecedentesDigestivos: historiaClinica.antecedentesDigestivos ?? null,
        antecedentesFamiliares: historiaClinica.antecedentesFamiliares ?? null,
        entrenamientos: historiaClinica.entrenamientos ?? null,
        descanso: historiaClinica.descanso ?? null,
        habitos: historiaClinica.habitos ?? null,
        informacionGeneral: historiaClinica.informacionGeneral ?? null,
      },
    };
  }

  /** Alta confirmada desde una ficha, con sus registros asociados. */
  async crearPacienteDesdeFicha(
    datos: CrearPacienteDesdeFichaDto,
  ): Promise<AltaDesdeFichaSalidaDto> {
    const { paciente, cuentaExistente, advertencias } =
      await this.crearDesdeFichaUC.ejecutar({
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

    // La misma bienvenida que el alta por formulario. Antes acá no se mandaba
    // —el razonamiento era que esta alta se hace con el paciente enfrente—,
    // pero el resultado era que quien entraba por documento se quedaba sin sus
    // datos de acceso y nadie lo notaba hasta que el paciente no podía entrar.
    // Que se mande o no es del consultorio y se decide con el interruptor
    // `bienvenidaAutomaticaActiva`, no del formulario que se haya usado.
    await this.darLaBienvenida(paciente, datos.password, cuentaExistente);

    return {
      paciente: ServicioPaciente.aSalida(paciente),
      cuentaExistente,
      advertencias,
    };
  }

  /** Mapea la entidad de dominio al DTO de salida. */
  private static aSalida(paciente: Paciente): PacienteSalidaDto {
    return paciente.aPrimitivos();
  }
}
