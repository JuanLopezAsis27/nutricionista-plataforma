import type { SolicitarRecuperacionPassword } from "@/aplicacion/casos-de-uso/autenticacion/SolicitarRecuperacionPassword";
import type { RestablecerPassword } from "@/aplicacion/casos-de-uso/autenticacion/RestablecerPassword";
import type { VerificarTokenRecuperacion } from "@/aplicacion/casos-de-uso/autenticacion/VerificarTokenRecuperacion";
import type { EmitirTokenRefresco } from "@/aplicacion/casos-de-uso/autenticacion/EmitirTokenRefresco";
import type { RenovarSesion } from "@/aplicacion/casos-de-uso/autenticacion/RenovarSesion";
import type { RevocarSesionesPersistentes } from "@/aplicacion/casos-de-uso/autenticacion/RevocarSesionesPersistentes";
import type { LimpiarSesionesCaducadas } from "@/aplicacion/casos-de-uso/autenticacion/LimpiarSesionesCaducadas";
import type { RolUsuario } from "@/dominio/entidades/Usuario";
import type {
  SolicitarRecuperacionDto,
  RestablecerPasswordDto,
} from "../dtos/autenticacion.dto";

/** Lo que necesita el JWT de Auth.js, más la credencial para la próxima vez. */
export interface SesionRefrescada {
  usuario: {
    id: string;
    email: string;
    rol: RolUsuario;
    pacienteId: string | null;
    nutricionistaId: string | null;
  };
  /** Token de refresco NUEVO: hay que guardarlo en la cookie. */
  token: string;
  expiraEn: Date;
}

/**
 * Servicio de aplicación de autenticación: recuperación de contraseña y
 * sesiones persistentes (tokens de refresco).
 */
export class ServicioAutenticacion {
  constructor(
    private readonly solicitarUC: SolicitarRecuperacionPassword,
    private readonly restablecerUC: RestablecerPassword,
    private readonly emitirRefrescoUC: EmitirTokenRefresco,
    private readonly renovarUC: RenovarSesion,
    private readonly revocarUC: RevocarSesionesPersistentes,
    private readonly limpiarUC: LimpiarSesionesCaducadas,
    private readonly verificarTokenUC: VerificarTokenRecuperacion,
  ) {}

  /**
   * Si el enlace de recuperación todavía sirve. Lo pregunta la página al
   * abrirse, para no mostrar un formulario que después va a rechazar.
   */
  async verificarTokenRecuperacion(
    token: string,
  ): Promise<{ vigente: boolean }> {
    return { vigente: await this.verificarTokenUC.ejecutar(token) };
  }

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

  /**
   * Abre una sesión persistente: el login acaba de verificar la contraseña y
   * pide la credencial con la que ese dispositivo volverá a entrar sin tipearla.
   */
  async abrirSesionPersistente(datos: {
    usuarioId: string;
    dispositivo?: string | null;
  }): Promise<{ token: string; expiraEn: Date }> {
    const { token, expiraEn } = await this.emitirRefrescoUC.ejecutar({
      usuarioId: datos.usuarioId,
      dispositivo: datos.dispositivo,
    });
    return { token, expiraEn };
  }

  /**
   * Canjea el token de refresco por una sesión nueva.
   *
   * Junta las dos mitades de la rotación: `RenovarSesion` valida y consume el
   * token presentado, `EmitirTokenRefresco` emite el siguiente en la MISMA
   * familia. Que la cadena se mantenga es lo que permite detectar después la
   * reutilización de cualquier eslabón.
   *
   * Lanza `ErrorTokenInvalido` si el token no sirve, por el motivo que sea.
   */
  async renovarSesion(datos: {
    token: string;
    dispositivo?: string | null;
  }): Promise<SesionRefrescada> {
    const { usuario, familia } = await this.renovarUC.ejecutar({
      token: datos.token,
    });

    const emitido = await this.emitirRefrescoUC.ejecutar({
      usuarioId: usuario.id,
      dispositivo: datos.dispositivo,
      familia,
    });

    return {
      usuario: {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        pacienteId: usuario.pacienteId,
        nutricionistaId: usuario.nutricionistaId,
      },
      token: emitido.token,
      expiraEn: emitido.expiraEn,
    };
  }

  /** Cierra la sesión persistente de ESTE dispositivo. */
  async cerrarSesionPersistente(token: string): Promise<void> {
    await this.revocarUC.ejecutar({ token });
  }

  /** Echa a TODOS los dispositivos (cambio de contraseña, baja de cuenta). */
  async cerrarSesionesDeUsuario(usuarioId: string): Promise<void> {
    await this.revocarUC.ejecutar({ usuarioId });
  }

  /** Borra los tokens de refresco que ya no sirven (lo corre el worker). */
  async limpiarSesionesCaducadas(): Promise<number> {
    return this.limpiarUC.ejecutar();
  }
}
