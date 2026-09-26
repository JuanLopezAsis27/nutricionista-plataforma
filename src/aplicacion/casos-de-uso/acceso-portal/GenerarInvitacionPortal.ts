import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { ICuentaPacienteRepositorio } from "@/dominio/repositorios/ICuentaPacienteRepositorio";
import type { IInvitacionPortalRepositorio } from "@/dominio/repositorios/IInvitacionPortalRepositorio";
import type { INutricionistaRepositorio } from "@/dominio/repositorios/INutricionistaRepositorio";
import type { IGeneradorCodigoInvitacion } from "@/dominio/servicios/IGeneradorCodigoInvitacion";
import type { IServicioEmail } from "@/dominio/servicios/IServicioEmail";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import { InvitacionPortal } from "@/dominio/entidades/InvitacionPortal";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { esCuentaExclusiva } from "@/dominio/servicios/cuentaPaciente";
import {
  DIAS_VIGENCIA_INVITACION,
  formatearCodigoInvitacion,
} from "@/dominio/servicios/codigoInvitacion";
import { escaparHtml } from "@/dominio/plantillas/renderizar";

const DIA_MS = 24 * 60 * 60 * 1000;

/** El código recién emitido. Es la única vez que existe en claro. */
export interface InvitacionEmitida {
  /** Formateado para mostrar: `K7PM-X3QD`. */
  codigo: string;
  expiraEn: Date;
  /** A dónde se mandó por email, o null si no se mandó. */
  enviadaA: string | null;
  /**
   * Por qué no salió el email, si se pidió y falló. No lanza: el código ya
   * está emitido y el profesional lo tiene en pantalla para darlo igual.
   */
  falloEnvio: string | null;
}

/**
 * Caso de uso: emitir el código de invitación al portal de una ficha.
 *
 * Sirve para dos cosas (ver docs/CUENTAS-PACIENTE.md):
 * - **La persona ya tiene cuenta** con otro profesional: canjeándolo desde esa
 *   cuenta, la ficha de acá queda en ella.
 * - **Se le creó una cuenta de más**: si la ficha tiene una cuenta EXCLUSIVA de
 *   este consultorio, al canjear el código desde la otra la ficha se muda y la
 *   de más se borra.
 *
 * No se emite para una ficha cuya cuenta es COMPARTIDA con otro consultorio:
 * mudarla le sacaría el acceso a alguien que no participa del cambio.
 *
 * Genera uno nuevo cada vez y anula los anteriores: el código viaja en claro
 * una sola vez (pantalla o email) y la base guarda solo su hash, así que "ver
 * el código de nuevo" es emitir otro.
 */
export class GenerarInvitacionPortal {
  constructor(
    private readonly pacientes: IPacienteRepositorio,
    private readonly usuarios: IUsuarioRepositorio,
    private readonly cuentas: ICuentaPacienteRepositorio,
    private readonly invitaciones: IInvitacionPortalRepositorio,
    private readonly generador: IGeneradorCodigoInvitacion,
    private readonly servicioEmail: IServicioEmail,
    private readonly nutricionistas: INutricionistaRepositorio,
    private readonly reloj: IRelojFecha,
    private readonly baseUrl: string,
  ) {}

  async ejecutar(datos: {
    pacienteId: string;
    /** Además de devolverlo, mandarlo al email de la ficha (si tiene). */
    enviarPorEmail: boolean;
  }): Promise<InvitacionEmitida> {
    const paciente = await this.pacientes.obtenerPorId(datos.pacienteId);
    if (!paciente) throw new ErrorPacienteNoEncontrado(datos.pacienteId);

    const cuenta = await this.usuarios.obtenerPorPacienteId(paciente.id);
    if (
      cuenta &&
      !esCuentaExclusiva(await this.cuentas.contarDeUsuario(cuenta.id))
    ) {
      throw new ErrorValidacion(
        `${paciente.nombreCompleto} ya usa una cuenta compartida con otro consultorio: no hace falta invitarlo.`,
      );
    }

    const ahora = this.reloj.ahora();
    const { codigo, hash } = this.generador.generar();
    const invitacion = await this.invitaciones.reemplazarDePaciente(
      InvitacionPortal.crear(
        {
          pacienteId: paciente.id,
          codigoHash: hash,
          expiraEn: new Date(
            ahora.getTime() + DIAS_VIGENCIA_INVITACION * DIA_MS,
          ),
        },
        crypto.randomUUID(),
        ahora,
      ),
    );

    const legible = formatearCodigoInvitacion(codigo);
    let enviadaA: string | null = null;
    let falloEnvio: string | null = null;
    if (datos.enviarPorEmail && paciente.email) {
      try {
        await this.enviarEmail(
          paciente.email,
          paciente.nombreCompleto,
          legible,
          codigo,
        );
        enviadaA = paciente.email;
      } catch (error) {
        console.error("[invitacion] no se pudo enviar el email:", error);
        falloEnvio = error instanceof Error ? error.message : String(error);
      }
    }
    return {
      codigo: legible,
      expiraEn: invitacion.expiraEn,
      enviadaA,
      falloEnvio,
    };
  }

  /**
   * Email fijo, no una plantilla editable: tiene que llevar el código y el
   * enlace sí o sí, y una plantilla guardada antes de esta función no los
   * tendría.
   */
  private async enviarEmail(
    para: string,
    nombrePaciente: string,
    codigoLegible: string,
    codigo: string,
  ): Promise<void> {
    const profesional = await this.nutricionistas.nombreDelActual();
    const enlace = `${this.baseUrl.replace(/\/$/, "")}/mis-consultorios?codigo=${encodeURIComponent(codigo)}`;
    const texto =
      `Hola ${nombrePaciente}:\n\n` +
      `${profesional} te invita a ver tu ficha en el portal. Como ya tenés una cuenta, ` +
      `no hace falta crear otra: entrá con tu usuario y contraseña de siempre y cargá este código en «Mis consultorios»:\n\n` +
      `${codigoLegible}\n\n` +
      `O abrí este enlace: ${enlace}\n\n` +
      `El código vence en ${DIAS_VIGENCIA_INVITACION} días. Si no esperabas este mensaje, ignoralo.`;
    await this.servicioEmail.enviar({
      para,
      asunto: `${profesional} te invita a su consultorio`,
      texto,
      html: `
      <div style="font-family: system-ui, sans-serif; color: #1f2937; max-width: 480px; margin: 0 auto;">
        <p>Hola ${escaparHtml(nombrePaciente)}:</p>
        <p>${escaparHtml(profesional)} te invita a ver tu ficha en el portal. Como ya tenés una cuenta, no hace falta crear otra: entrá con tu usuario y contraseña de siempre y cargá este código en <strong>Mis consultorios</strong>.</p>
        <p style="font-size: 24px; font-weight: 700; letter-spacing: 4px; text-align: center; margin: 24px 0;">${escaparHtml(codigoLegible)}</p>
        <p style="margin: 24px 0; text-align: center;">
          <a href="${enlace}" style="background: #F4535E; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">Agregar el consultorio</a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">El código vence en ${DIAS_VIGENCIA_INVITACION} días. Si no esperabas este mensaje, ignoralo.</p>
      </div>`,
    });
  }
}
