import type { SolicitarRecuperacionPassword } from "@/aplicacion/casos-de-uso/autenticacion/SolicitarRecuperacionPassword";
import type { RestablecerPassword } from "@/aplicacion/casos-de-uso/autenticacion/RestablecerPassword";
import type {
  SolicitarRecuperacionDto,
  RestablecerPasswordDto,
} from "../dtos/autenticacion.dto";

/**
 * Servicio de aplicación de autenticación: orquesta el flujo de recuperación
 * de contraseña (solicitar enlace + restablecer con token).
 */
export class ServicioAutenticacion {
  constructor(
    private readonly solicitarUC: SolicitarRecuperacionPassword,
    private readonly restablecerUC: RestablecerPassword,
  ) {}

  /** Siempre resuelve OK aunque el email no exista (no revela cuentas). */
  async solicitarRecuperacion(
    datos: SolicitarRecuperacionDto,
  ): Promise<{ enviado: true }> {
    await this.solicitarUC.ejecutar({ email: datos.email });
    return { enviado: true };
  }

  async restablecer(
    datos: RestablecerPasswordDto,
  ): Promise<{ restablecido: true }> {
    await this.restablecerUC.ejecutar({
      token: datos.token,
      nuevaPassword: datos.password,
    });
    return { restablecido: true };
  }
}
