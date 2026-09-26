import type { DarAccesoPortal } from "@/aplicacion/casos-de-uso/acceso-portal/DarAccesoPortal";
import type { GenerarInvitacionPortal } from "@/aplicacion/casos-de-uso/acceso-portal/GenerarInvitacionPortal";
import type { CanjearInvitacionPortal } from "@/aplicacion/casos-de-uso/acceso-portal/CanjearInvitacionPortal";
import type { ObtenerAccesoPortal } from "@/aplicacion/casos-de-uso/acceso-portal/ObtenerAccesoPortal";
import type { RestablecerPasswordPaciente } from "@/aplicacion/casos-de-uso/acceso-portal/RestablecerPasswordPaciente";
import type { SugerirNombreUsuario } from "@/aplicacion/casos-de-uso/acceso-portal/SugerirNombreUsuario";
import type { CambiarUsuarioPaciente } from "@/aplicacion/casos-de-uso/acceso-portal/CambiarUsuarioPaciente";
import type { RevisarEmailPaciente } from "@/aplicacion/casos-de-uso/acceso-portal/RevisarEmailPaciente";
import type {
  AccesoPortalSalidaDto,
  CambiarUsuarioPacienteDto,
  CredencialesPortalSalidaDto,
  DarAccesoPortalDto,
  GenerarInvitacionPortalDto,
  InvitacionEmitidaSalidaDto,
  RestablecerPasswordPacienteDto,
  RevisionEmailSalidaDto,
  ResultadoAccesoSalidaDto,
  VistaInvitacionSalidaDto,
} from "../dtos/acceso-portal.dto";

/**
 * Servicio de aplicación del acceso al portal de los pacientes (migración 80):
 * la cuenta de una ficha, su contraseña y los códigos de invitación.
 *
 * Tiene dos públicos. El PROFESIONAL, desde la ficha: ver el acceso, darlo,
 * emitir un código, restablecer la contraseña. El PACIENTE, desde su cuenta:
 * canjear un código. Lo segundo cruza consultorios, así que el router fija el
 * alcance en dos pasos (ver `ubicarInvitacion`).
 */
export class ServicioAccesoPortal {
  constructor(
    private readonly obtenerUC: ObtenerAccesoPortal,
    private readonly darAccesoUC: DarAccesoPortal,
    private readonly generarInvitacionUC: GenerarInvitacionPortal,
    private readonly canjearUC: CanjearInvitacionPortal,
    private readonly restablecerUC: RestablecerPasswordPaciente,
    private readonly sugerirUC: SugerirNombreUsuario,
    private readonly cambiarUsuarioUC: CambiarUsuarioPaciente,
    private readonly revisarEmailUC: RevisarEmailPaciente,
  ) {}

  /** Qué implica el email que se está cargando (ver `RevisarEmailPaciente`). */
  async revisarEmail(
    email: string,
    pacienteId: string | null,
  ): Promise<RevisionEmailSalidaDto> {
    return this.revisarEmailUC.ejecutar(email, pacienteId);
  }

  /** Pone, cambia o saca el nombre de usuario (cuentas exclusivas). */
  async cambiarUsuario(
    datos: CambiarUsuarioPacienteDto,
  ): Promise<{ identificador: string }> {
    return this.cambiarUsuarioUC.ejecutar(datos);
  }

  async obtener(pacienteId: string): Promise<AccesoPortalSalidaDto> {
    return this.obtenerUC.ejecutar(pacienteId);
  }

  /**
   * Darle cuenta a una ficha que no tiene. Si su email ya es la cuenta de un
   * paciente de otro consultorio no se crea nada: se emite la invitación (sin
   * mandarla; la pantalla ofrece hacerlo).
   */
  async darAcceso(
    datos: DarAccesoPortalDto,
  ): Promise<ResultadoAccesoSalidaDto> {
    const resultado = await this.darAccesoUC.ejecutar(datos.pacienteId, {
      nombreUsuario: datos.nombreUsuario ?? null,
      password: datos.password,
    });
    if (resultado.tipo === "CUENTA_NUEVA") {
      return {
        tipo: "CUENTA_NUEVA",
        identificador: resultado.cuenta.identificador,
      };
    }
    return {
      tipo: "INVITACION",
      invitacion: await this.generarInvitacionUC.ejecutar({
        pacienteId: datos.pacienteId,
        enviarPorEmail: false,
      }),
    };
  }

  async generarInvitacion(
    datos: GenerarInvitacionPortalDto,
  ): Promise<InvitacionEmitidaSalidaDto> {
    return this.generarInvitacionUC.ejecutar(datos);
  }

  async restablecerPassword(
    datos: RestablecerPasswordPacienteDto,
  ): Promise<CredencialesPortalSalidaDto> {
    return this.restablecerUC.ejecutar({
      pacienteId: datos.pacienteId,
      contrasena:
        datos.contrasena.modo === "MANUAL" ? datos.contrasena.valor : null,
    });
  }

  async sugerirNombreUsuario(
    nombre: string,
    apellido: string,
  ): Promise<{ nombreUsuario: string | null }> {
    return { nombreUsuario: await this.sugerirUC.ejecutar(nombre, apellido) };
  }

  /** Paso 1 del canje, con alcance global: de qué consultorio es el código. */
  async ubicarInvitacion(codigo: string): Promise<string> {
    return this.canjearUC.ubicar(codigo);
  }

  /** Paso 2, en el consultorio del código. */
  async previsualizarInvitacion(
    usuarioId: string,
    codigo: string,
  ): Promise<VistaInvitacionSalidaDto> {
    return this.canjearUC.previsualizar(usuarioId, codigo);
  }

  /** Paso 3, en el consultorio del código: devuelve la ficha que sumó. */
  async canjearInvitacion(
    usuarioId: string,
    codigo: string,
  ): Promise<{ pacienteId: string }> {
    return { pacienteId: await this.canjearUC.canjear(usuarioId, codigo) };
  }
}
