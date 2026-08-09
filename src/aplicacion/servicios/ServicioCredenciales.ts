import type { ICredencialesIntegracionRepositorio } from "@/dominio/repositorios/ICredencialesIntegracionRepositorio";
import type { EstadoCredencialesDto, GuardarCredencialesDto } from "../dtos/credenciales.dto";

/**
 * Servicio de aplicación de credenciales de integración del profesional.
 * `obtenerEstado` NUNCA devuelve los secretos (solo si están configurados).
 */
export class ServicioCredenciales {
  constructor(private readonly credenciales: ICredencialesIntegracionRepositorio) {}

  async obtenerEstado(): Promise<EstadoCredencialesDto> {
    const c = await this.credenciales.obtener();
    return {
      proveedorIA: c?.proveedorIA ?? "ANTHROPIC",
      anthropicConfigurado: Boolean(c?.anthropicApiKey),
      anthropicModelo: c?.anthropicModelo ?? null,
      fatsecretConfigurado: Boolean(c?.fatsecretClientId && c?.fatsecretClientSecret),
      criterios: c?.criterios ?? {
        excluirMarcas: false,
        requiereMacros: false,
        maxCaloriasPor100: null,
        excluirTexto: [],
      },
    };
  }

  guardar(datos: GuardarCredencialesDto): Promise<void> {
    return this.credenciales.guardar(datos);
  }
}
