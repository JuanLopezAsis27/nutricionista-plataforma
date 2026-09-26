import type { SolicitarRecuperacionPassword } from "@/aplicacion/casos-de-uso/autenticacion/SolicitarRecuperacionPassword";
import type { RestablecerPassword } from "@/aplicacion/casos-de-uso/autenticacion/RestablecerPassword";
import type { VerificarTokenRecuperacion } from "@/aplicacion/casos-de-uso/autenticacion/VerificarTokenRecuperacion";
import type { EmitirTokenRefresco } from "@/aplicacion/casos-de-uso/autenticacion/EmitirTokenRefresco";
import type { RenovarSesion } from "@/aplicacion/casos-de-uso/autenticacion/RenovarSesion";
import type { RevocarSesionesPersistentes } from "@/aplicacion/casos-de-uso/autenticacion/RevocarSesionesPersistentes";
import type { LimpiarSesionesCaducadas } from "@/aplicacion/casos-de-uso/autenticacion/LimpiarSesionesCaducadas";
import type {
  ResolverConsultorioActivo,
  IdentidadDeSesion,
} from "@/aplicacion/casos-de-uso/autenticacion/ResolverConsultorioActivo";
import { ErrorTokenInvalido } from "@/dominio/errores/ErrorTokenInvalido";
import type { CambiarConsultorioActivo } from "@/aplicacion/casos-de-uso/autenticacion/CambiarConsultorioActivo";
import type { ListarMisConsultorios } from "@/aplicacion/casos-de-uso/autenticacion/ListarMisConsultorios";
import type {
  SolicitarRecuperacionDto,
  RestablecerPasswordDto,
  ConsultorioSalidaDto,
} from "../dtos/autenticacion.dto";

export type { IdentidadDeSesion };

/** Lo que necesita el JWT de Auth.js, más la credencial para la próxima vez. */
export interface SesionRefrescada {
  usuario: IdentidadDeSesion;
  /** Token de refresco NUEVO: hay que guardarlo en la cookie. */
  token: string;
  expiraEn: Date;
}

/**
 * Servicio de aplicación de autenticación: recuperación de contraseña,
 * sesiones persistentes (tokens de refresco) y el consultorio en el que
 * trabaja un paciente que se atiende en varios.
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
    private readonly resolverConsultorioUC: ResolverConsultorioActivo,
    private readonly cambiarConsultorioUC: CambiarConsultorioActivo,
    private readonly listarConsultoriosUC: ListarMisConsultorios,
  ) {}

  /**
   * La identidad con la que se emite una sesión: la usan el login, la
   * renovación y el cambio de consultorio, así los tres deciden igual.
   * `pacientePreferidoId` es la última elección del dispositivo (una cookie):
   * se revalida contra las fichas de la cuenta.
   */
  async identidadDeSesion(
    usuarioId: string,
    pacientePreferidoId: string | null,
  ): Promise<IdentidadDeSesion | null> {
    return this.resolverConsultorioUC.ejecutar(usuarioId, pacientePreferidoId);
  }

  /** Los consultorios de la cuenta, marcando el de la sesión en curso. */
  async misConsultorios(
    usuarioId: string,
    pacienteActivoId: string | null,
  ): Promise<ConsultorioSalidaDto[]> {
    const consultorios = await this.listarConsultoriosUC.ejecutar(usuarioId);
    return consultorios.map((c) => ({
      pacienteId: c.pacienteId,
      nutricionistaId: c.nutricionistaId,
      nombreProfesional: c.nombreProfesional,
      fotoProfesionalId: c.fotoProfesionalId,
      activo: c.pacienteId === pacienteActivoId,
    }));
  }

  /**
   * Valida que la cuenta tenga acceso a esa ficha. Lanza
   * `ErrorAccesoDenegado` si no. Recordarla y reemitir la sesión es del borde.
   */
  async cambiarConsultorio(
    usuarioId: string,
    pacienteId: string,
  ): Promise<void> {
    await this.cambiarConsultorioUC.ejecutar(usuarioId, pacienteId);
  }

  /**
   * Si el enlace de recuperación todavía sirve. Lo pregunta la página al
   * abrirse, para no mostrar un formulario que después va a rechazar.
   */
  async verificarTokenRecuperacion(
    token: string,
  ): Promise<{ vigente: boolean }> {
    return { vigente: await this.verificarTokenUC.ejecutar(token) };
  }

  /** Siempre resuelve OK aunque la cuenta no exista (no revela cuentas). */
  async solicitarRecuperacion(
    datos: SolicitarRecuperacionDto,
  ): Promise<{ enviado: true }> {
    await this.solicitarUC.ejecutar({ identificador: datos.identificador });
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
    /** Última elección de consultorio en este dispositivo (cookie). */
    pacientePreferidoId?: string | null;
  }): Promise<SesionRefrescada> {
    const { usuario, familia } = await this.renovarUC.ejecutar({
      token: datos.token,
    });

    const emitido = await this.emitirRefrescoUC.ejecutar({
      usuarioId: usuario.id,
      dispositivo: datos.dispositivo,
      familia,
    });

    // El consultorio sale de las fichas de HOY, no de los del login: una
    // ficha borrada en el medio no puede seguir abierta por 30 días.
    const identidad = await this.resolverConsultorioUC.ejecutar(
      usuario.id,
      datos.pacientePreferidoId ?? null,
    );
    if (!identidad) throw new ErrorTokenInvalido();

    return {
      usuario: identidad,
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
