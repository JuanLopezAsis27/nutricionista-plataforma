import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { ITokenRecuperacionRepositorio } from "@/dominio/repositorios/ITokenRecuperacionRepositorio";
import type { IGeneradorTokens } from "@/dominio/servicios/IGeneradorTokens";
import type { IServicioEmail } from "@/dominio/servicios/IServicioEmail";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import type { INutricionistaRepositorio } from "@/dominio/repositorios/INutricionistaRepositorio";
import type { ICuentaPacienteRepositorio } from "@/dominio/repositorios/ICuentaPacienteRepositorio";
import type { Usuario } from "@/dominio/entidades/Usuario";
import { TokenRecuperacion } from "@/dominio/entidades/TokenRecuperacion";
import { escaparHtml } from "@/dominio/plantillas/renderizar";
import { esIdentificadorEmail } from "@/dominio/servicios/nombreUsuario";

/** Entrada del caso de uso. */
export interface EntradaSolicitarRecuperacion {
  /** El email o el nombre de usuario de la cuenta (migración 80). */
  identificador: string;
}

/** Duración de validez del enlace de recuperación (1 hora). */
const VALIDEZ_MS = 60 * 60 * 1000;

/**
 * Caso de uso: solicitar la recuperación de la contraseña.
 *
 * Genera un token de un solo uso, guarda solo su hash e informa al usuario por
 * email con un enlace `${baseUrl}/restablecer?token=…`. Invalida los tokens
 * previos del mismo usuario.
 *
 * IMPORTANTE (privacidad): NUNCA revela si el email existe. Si no hay usuario
 * (o está inactivo), termina en silencio con éxito aparente. Así un atacante no
 * puede enumerar cuentas registradas.
 *
 * Se puede pedir con el email o con el nombre de usuario. Una cuenta SIN email
 * (un paciente que entra con usuario) no tiene a dónde recibir el enlace:
 * también termina en silencio, y la pantalla —que dice siempre lo mismo— le
 * explica que en ese caso la contraseña se la restablece su profesional.
 */
export class SolicitarRecuperacionPassword {
  constructor(
    private readonly usuarios: IUsuarioRepositorio,
    private readonly tokens: ITokenRecuperacionRepositorio,
    private readonly generador: IGeneradorTokens,
    private readonly servicioEmail: IServicioEmail,
    private readonly reloj: IRelojFecha,
    private readonly baseUrl: string,
    /**
     * Firma del email: el nombre del consultorio al que pertenece la cuenta.
     * Corre con alcance global (es público y todavía no hay sesión), así que
     * se pide por id y no como "el actual".
     */
    private readonly nutricionistas: INutricionistaRepositorio,
    /** Los consultorios de un paciente: su cuenta no es de ninguno. */
    private readonly cuentas: ICuentaPacienteRepositorio,
  ) {}

  async ejecutar(entrada: EntradaSolicitarRecuperacion): Promise<void> {
    const identificador = entrada.identificador.trim().toLowerCase();
    const usuario = esIdentificadorEmail(identificador)
      ? await this.usuarios.obtenerPorEmail(identificador)
      : await this.usuarios.obtenerPorNombreUsuario(identificador);

    // No revelar la existencia de la cuenta: salir en silencio.
    if (!usuario || !usuario.activo || !usuario.email) {
      return;
    }
    const email = usuario.email;

    // Un solo token válido por usuario: invalidar los anteriores.
    await this.tokens.eliminarDeUsuario(usuario.id);

    const ahora = this.reloj.ahora();
    const { token, hash } = this.generador.generar();
    const registro = TokenRecuperacion.crear(
      {
        usuarioId: usuario.id,
        tokenHash: hash,
        expiraEn: new Date(ahora.getTime() + VALIDEZ_MS),
      },
      crypto.randomUUID(),
      ahora,
    );
    await this.tokens.crear(registro);

    const enlace = `${this.baseUrl.replace(/\/$/, "")}/restablecer?token=${encodeURIComponent(token)}`;
    await this.servicioEmail.enviar({
      para: email,
      asunto: "Restablecé tu contraseña",
      html: this.plantillaHtml(enlace, await this.firma(usuario)),
      texto:
        `Recibimos un pedido para restablecer tu contraseña.\n\n` +
        `Abrí este enlace (válido por 1 hora): ${enlace}\n\n` +
        `Si no fuiste vos, ignorá este mensaje.`,
    });
  }

  /**
   * El SUPERADMIN no pertenece a ningún consultorio: su email sale sin firma,
   * que es mejor que firmarlo con el nombre de otro. Lo mismo el paciente que
   * se atiende en varios: la contraseña es una sola para todos, y firmar con
   * uno solo de ellos diría que es de ese consultorio.
   */
  private async firma(usuario: Usuario): Promise<string | null> {
    if (usuario.esPaciente) {
      const consultorios = await this.cuentas.listarDeUsuario(usuario.id);
      return consultorios.length === 1
        ? consultorios[0]!.nombreProfesional
        : null;
    }
    if (!usuario.nutricionistaId) return null;
    return this.nutricionistas.nombreDe(usuario.nutricionistaId);
  }

  private plantillaHtml(enlace: string, firma: string | null): string {
    return `
      <div style="font-family: system-ui, sans-serif; color: #1f2937; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #111827;">Restablecé tu contraseña</h2>
        <p>Recibimos un pedido para restablecer la contraseña de tu cuenta.</p>
        <p style="margin: 24px 0;">
          <a href="${enlace}"
             style="background: #F4535E; color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Elegir una contraseña nueva
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">El enlace vence en 1 hora. Si no lo solicitaste, ignorá este correo.</p>
        ${firma ? `<p style="color: #6b7280; font-size: 14px;">— ${escaparHtml(firma)}</p>` : ""}
      </div>`;
  }
}
