import type { IUsuarioRepositorio } from "../../repositorios/IUsuarioRepositorio";
import type { ITokenRecuperacionRepositorio } from "../../repositorios/ITokenRecuperacionRepositorio";
import type { IGeneradorTokens } from "../../servicios/IGeneradorTokens";
import type { IServicioEmail } from "../../servicios/IServicioEmail";
import type { IRelojFecha } from "../../servicios/IRelojFecha";
import { TokenRecuperacion } from "../../entidades/TokenRecuperacion";

/** Entrada del caso de uso. */
export interface EntradaSolicitarRecuperacion {
  email: string;
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
 */
export class SolicitarRecuperacionPassword {
  constructor(
    private readonly usuarios: IUsuarioRepositorio,
    private readonly tokens: ITokenRecuperacionRepositorio,
    private readonly generador: IGeneradorTokens,
    private readonly servicioEmail: IServicioEmail,
    private readonly reloj: IRelojFecha,
    private readonly baseUrl: string,
    private readonly nombreProfesional: string,
  ) {}

  async ejecutar(entrada: EntradaSolicitarRecuperacion): Promise<void> {
    const email = entrada.email.trim().toLowerCase();
    const usuario = await this.usuarios.obtenerPorEmail(email);

    // No revelar la existencia de la cuenta: salir en silencio.
    if (!usuario || !usuario.activo) {
      return;
    }

    // Un solo token válido por usuario: invalidar los anteriores.
    await this.tokens.eliminarDeUsuario(usuario.id);

    const ahora = this.reloj.ahora();
    const { token, hash } = this.generador.generar();
    const registro = TokenRecuperacion.crear(
      { usuarioId: usuario.id, tokenHash: hash, expiraEn: new Date(ahora.getTime() + VALIDEZ_MS) },
      crypto.randomUUID(),
      ahora,
    );
    await this.tokens.crear(registro);

    const enlace = `${this.baseUrl.replace(/\/$/, "")}/restablecer?token=${encodeURIComponent(token)}`;
    await this.servicioEmail.enviar({
      para: usuario.email,
      asunto: "Restablecé tu contraseña",
      html: this.plantillaHtml(enlace),
      texto:
        `Recibimos un pedido para restablecer tu contraseña.\n\n` +
        `Abrí este enlace (válido por 1 hora): ${enlace}\n\n` +
        `Si no fuiste vos, ignorá este mensaje.`,
    });
  }

  private plantillaHtml(enlace: string): string {
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
        <p style="color: #6b7280; font-size: 14px;">— ${this.nombreProfesional}</p>
      </div>`;
  }
}
