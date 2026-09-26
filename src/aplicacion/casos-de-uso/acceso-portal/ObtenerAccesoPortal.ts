import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { ICuentaPacienteRepositorio } from "@/dominio/repositorios/ICuentaPacienteRepositorio";
import type { IInvitacionPortalRepositorio } from "@/dominio/repositorios/IInvitacionPortalRepositorio";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { esCuentaExclusiva } from "@/dominio/servicios/cuentaPaciente";

/**
 * El acceso al portal de una ficha, visto por su profesional.
 *
 * - `SIN_CUENTA`: la ficha no entra al portal (todavía).
 * - `EXCLUSIVA`: la cuenta es solo de este consultorio; la administra él.
 * - `COMPARTIDA`: la persona la usa también con otro profesional. Es suya: de
 *   ella no se muestra con qué entra ni se toca nada.
 */
export interface AccesoPortal {
  estado: "SIN_CUENTA" | "EXCLUSIVA" | "COMPARTIDA";
  email: string | null;
  nombreUsuario: string | null;
  activa: boolean;
  passwordProvisional: boolean;
  /** Vencimiento del código de invitación pendiente, si hay uno. */
  invitacionVigenteHasta: Date | null;
}

/** Caso de uso: el estado del acceso al portal de una ficha. */
export class ObtenerAccesoPortal {
  constructor(
    private readonly pacientes: IPacienteRepositorio,
    private readonly usuarios: IUsuarioRepositorio,
    private readonly cuentas: ICuentaPacienteRepositorio,
    private readonly invitaciones: IInvitacionPortalRepositorio,
    private readonly reloj: IRelojFecha,
  ) {}

  async ejecutar(pacienteId: string): Promise<AccesoPortal> {
    if (!(await this.pacientes.obtenerPorId(pacienteId))) {
      throw new ErrorPacienteNoEncontrado(pacienteId);
    }
    const invitacion = await this.invitaciones.vigenteDePaciente(
      pacienteId,
      this.reloj.ahora(),
    );
    const invitacionVigenteHasta = invitacion?.expiraEn ?? null;

    const cuenta = await this.usuarios.obtenerPorPacienteId(pacienteId);
    if (!cuenta) {
      return {
        estado: "SIN_CUENTA",
        email: null,
        nombreUsuario: null,
        activa: false,
        passwordProvisional: false,
        invitacionVigenteHasta,
      };
    }
    if (!esCuentaExclusiva(await this.cuentas.contarDeUsuario(cuenta.id))) {
      return {
        estado: "COMPARTIDA",
        email: null,
        nombreUsuario: null,
        activa: cuenta.activo,
        passwordProvisional: false,
        invitacionVigenteHasta: null,
      };
    }
    return {
      estado: "EXCLUSIVA",
      email: cuenta.email,
      nombreUsuario: cuenta.nombreUsuario,
      activa: cuenta.activo,
      passwordProvisional: cuenta.passwordProvisional,
      invitacionVigenteHasta,
    };
  }
}
