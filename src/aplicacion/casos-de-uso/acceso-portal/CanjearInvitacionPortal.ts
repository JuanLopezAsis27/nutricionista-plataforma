import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { ICuentaPacienteRepositorio } from "@/dominio/repositorios/ICuentaPacienteRepositorio";
import type {
  IInvitacionPortalRepositorio,
  InvitacionEncontrada,
} from "@/dominio/repositorios/IInvitacionPortalRepositorio";
import type { INutricionistaRepositorio } from "@/dominio/repositorios/INutricionistaRepositorio";
import type { IGeneradorCodigoInvitacion } from "@/dominio/servicios/IGeneradorCodigoInvitacion";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import { ErrorInvitacionInvalida } from "@/dominio/errores/ErrorInvitacionInvalida";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import { esCuentaExclusiva } from "@/dominio/servicios/cuentaPaciente";
import {
  esCodigoInvitacionBienFormado,
  normalizarCodigoInvitacion,
} from "@/dominio/servicios/codigoInvitacion";

/** Lo que la persona ve antes de confirmar. */
export interface VistaInvitacion {
  nombreProfesional: string;
  /** De quién es la ficha: si no es la persona, tiene que poder notarlo. */
  nombrePaciente: string;
}

/**
 * Canjear un código de invitación al portal desde la cuenta de la persona
 * (migración 80). Ver `InvitacionPortal` y docs/CUENTAS-PACIENTE.md.
 *
 * Son tres pasos porque el código llega ANTES de saber de qué consultorio es:
 *
 * 1. `ubicar` (alcance global): de qué consultorio es el código. Es lo único
 *    que cruza el límite, para que quien llama fije ese alcance.
 * 2. `previsualizar` (en ese consultorio): a nombre de quién está la ficha y de
 *    qué profesional, para que la persona confirme sabiendo qué suma. Un
 *    código que le llegó al email de la madre puede ser el de un hermano.
 * 3. `canjear` (en ese consultorio): la ficha queda en la cuenta de quien
 *    canjea. Si ya tenía otra cuenta —exclusiva de este consultorio, porque
 *    las compartidas no reciben invitación— se muda y la vieja se borra.
 *
 * Solo para cuentas de PACIENTE: el router lo exige por rol.
 */
export class CanjearInvitacionPortal {
  constructor(
    private readonly invitaciones: IInvitacionPortalRepositorio,
    private readonly generador: IGeneradorCodigoInvitacion,
    private readonly pacientes: IPacienteRepositorio,
    private readonly usuarios: IUsuarioRepositorio,
    private readonly cuentas: ICuentaPacienteRepositorio,
    private readonly nutricionistas: INutricionistaRepositorio,
    private readonly reloj: IRelojFecha,
  ) {}

  /** Paso 1, con alcance global: el consultorio del código. */
  async ubicar(codigo: string): Promise<string> {
    return (await this.buscar(codigo)).nutricionistaId;
  }

  /** Paso 2, en el consultorio del código. */
  async previsualizar(
    usuarioId: string,
    codigo: string,
  ): Promise<VistaInvitacion> {
    const { invitacion, nutricionistaId } = await this.buscar(codigo);
    const paciente = await this.pacientes.obtenerPorId(invitacion.pacienteId);
    if (!paciente) throw new ErrorInvitacionInvalida();
    await this.verificarQueNoTengaFichaAca(usuarioId, nutricionistaId);
    return {
      nombreProfesional:
        (await this.nutricionistas.nombreDe(nutricionistaId)) ?? "",
      nombrePaciente: paciente.nombreCompleto,
    };
  }

  /** Paso 3, en el consultorio del código. Devuelve la ficha que sumó. */
  async canjear(usuarioId: string, codigo: string): Promise<string> {
    const { invitacion, nutricionistaId } = await this.buscar(codigo);
    const pacienteId = invitacion.pacienteId;
    if (!(await this.pacientes.obtenerPorId(pacienteId))) {
      throw new ErrorInvitacionInvalida();
    }
    await this.verificarQueNoTengaFichaAca(usuarioId, nutricionistaId);

    const anterior = await this.usuarios.obtenerPorPacienteId(pacienteId);
    if (
      anterior &&
      !esCuentaExclusiva(await this.cuentas.contarDeUsuario(anterior.id))
    ) {
      // No pasa si el código se emitió bien (la emisión lo rechaza), pero la
      // ficha pudo cambiar de cuenta desde entonces.
      throw new ErrorInvitacionInvalida();
    }

    await this.cuentas.vincular(usuarioId, pacienteId);
    await this.invitaciones.marcarUsada(invitacion.id, this.reloj.ahora());
    // La cuenta de más quedó sin fichas: no le abre nada a nadie y tiene
    // tomados un email o un usuario. Con ella se van sus sesiones (CASCADE).
    if (anterior) await this.usuarios.eliminar(anterior.id);
    return pacienteId;
  }

  private async buscar(codigo: string): Promise<InvitacionEncontrada> {
    const normalizado = normalizarCodigoInvitacion(codigo);
    if (!esCodigoInvitacionBienFormado(normalizado)) {
      throw new ErrorInvitacionInvalida();
    }
    const encontrada = await this.invitaciones.obtenerPorCodigoHash(
      this.generador.hashear(normalizado),
    );
    if (!encontrada || !encontrada.invitacion.estaVigente(this.reloj.ahora())) {
      throw new ErrorInvitacionInvalida();
    }
    return encontrada;
  }

  /**
   * Una cuenta tiene una ficha por consultorio. Si ya tiene una acá, es otra
   * persona para este profesional (o la misma cargada dos veces): eso lo
   * resuelve el consultorio, no el canje.
   */
  private async verificarQueNoTengaFichaAca(
    usuarioId: string,
    nutricionistaId: string,
  ): Promise<void> {
    const consultorios = await this.cuentas.listarDeUsuario(usuarioId);
    if (consultorios.some((c) => c.nutricionistaId === nutricionistaId)) {
      throw new ErrorValidacion(
        "Tu cuenta ya tiene una ficha en ese consultorio. Si el código es para otra persona, tiene que canjearlo desde su propia cuenta.",
      );
    }
  }
}
