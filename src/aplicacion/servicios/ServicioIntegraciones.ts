import type { ObtenerCuentaGoogle } from "@/aplicacion/casos-de-uso/integraciones/ObtenerCuentaGoogle";
import type { GuardarConexionGoogle } from "@/aplicacion/casos-de-uso/integraciones/GuardarConexionGoogle";
import type { DesconectarGoogle } from "@/aplicacion/casos-de-uso/integraciones/DesconectarGoogle";
import type { TokensGoogle } from "@/dominio/servicios/IProveedorGoogle";
import type { EstadoIntegracionesDto } from "../dtos/integraciones.dto";

/**
 * Servicio de aplicación de Integraciones (Google). Si la integración no está
 * configurada (sin credenciales), los casos de uso son null y el estado informa
 * `configurado: false` — la app sigue funcionando sin Google.
 */
export class ServicioIntegraciones {
  constructor(
    private readonly googleConfigurado: boolean,
    private readonly obtenerCuentaUC: ObtenerCuentaGoogle | null,
    private readonly guardarConexionUC: GuardarConexionGoogle | null,
    private readonly desconectarUC: DesconectarGoogle | null,
  ) {}

  get googleHabilitado(): boolean {
    return this.googleConfigurado;
  }

  async estado(): Promise<EstadoIntegracionesDto> {
    if (!this.googleConfigurado || !this.obtenerCuentaUC) {
      return {
        google: { configurado: false, conectado: false, emailCuenta: null },
      };
    }
    const cuenta = await this.obtenerCuentaUC.ejecutar();
    return {
      google: {
        configurado: true,
        conectado: cuenta != null,
        emailCuenta: cuenta?.emailCuenta ?? null,
      },
    };
  }

  /** Guarda la conexión desde el callback OAuth (solo si está configurada). */
  async guardarConexionGoogle(tokens: TokensGoogle): Promise<void> {
    if (this.guardarConexionUC) await this.guardarConexionUC.ejecutar(tokens);
  }

  async desconectarGoogle(): Promise<void> {
    if (this.desconectarUC) await this.desconectarUC.ejecutar();
  }
}
