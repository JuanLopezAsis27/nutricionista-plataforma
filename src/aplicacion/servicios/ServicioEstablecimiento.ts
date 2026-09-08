import type { ListarEstablecimientos } from "@/aplicacion/casos-de-uso/establecimientos/ListarEstablecimientos";
import type { ObtenerEstablecimientoVigente } from "@/aplicacion/casos-de-uso/establecimientos/ObtenerEstablecimientoVigente";
import type { CrearEstablecimiento } from "@/aplicacion/casos-de-uso/establecimientos/CrearEstablecimiento";
import type { ActualizarEstablecimiento } from "@/aplicacion/casos-de-uso/establecimientos/ActualizarEstablecimiento";
import type { ArchivarEstablecimiento } from "@/aplicacion/casos-de-uso/establecimientos/ArchivarEstablecimiento";
import type { RestaurarEstablecimiento } from "@/aplicacion/casos-de-uso/establecimientos/RestaurarEstablecimiento";
import type { FijarEstablecimientoPrincipal } from "@/aplicacion/casos-de-uso/establecimientos/FijarEstablecimientoPrincipal";
import type { Establecimiento } from "@/dominio/entidades/Establecimiento";
import type {
  CrearEstablecimientoDto,
  ActualizarEstablecimientoDto,
  ListarEstablecimientosDto,
  EstablecimientoSalidaDto,
} from "../dtos/establecimiento.dto";

/**
 * Servicio de aplicación de Establecimientos: los lugares donde el profesional
 * atiende, con la agenda (días, horario, duración y paso) de cada uno.
 */
export class ServicioEstablecimiento {
  constructor(
    private readonly listarUC: ListarEstablecimientos,
    private readonly vigenteUC: ObtenerEstablecimientoVigente,
    private readonly crearUC: CrearEstablecimiento,
    private readonly actualizarUC: ActualizarEstablecimiento,
    private readonly archivarUC: ArchivarEstablecimiento,
    private readonly restaurarUC: RestaurarEstablecimiento,
    private readonly fijarPrincipalUC: FijarEstablecimientoPrincipal,
  ) {}

  async listar(
    datos: ListarEstablecimientosDto = {},
  ): Promise<EstablecimientoSalidaDto[]> {
    return (await this.listarUC.ejecutar(datos)).map(
      ServicioEstablecimiento.aSalida,
    );
  }

  /**
   * La sede que rige si nadie eligió otra. Devuelve `null` —y no un error—
   * cuando el consultorio no tiene ninguna: la pantalla que la consume tiene
   * que poder decir "creá tu primer establecimiento" en vez de romperse.
   */
  async vigente(): Promise<EstablecimientoSalidaDto | null> {
    const establecimiento = await this.vigenteUC.ejecutar();
    return establecimiento
      ? ServicioEstablecimiento.aSalida(establecimiento)
      : null;
  }

  async crear(
    datos: CrearEstablecimientoDto,
  ): Promise<EstablecimientoSalidaDto> {
    return ServicioEstablecimiento.aSalida(await this.crearUC.ejecutar(datos));
  }

  async actualizar(
    datos: ActualizarEstablecimientoDto,
  ): Promise<EstablecimientoSalidaDto> {
    const { id, ...cambios } = datos;
    return ServicioEstablecimiento.aSalida(
      await this.actualizarUC.ejecutar(id, cambios),
    );
  }

  async archivar(id: string): Promise<EstablecimientoSalidaDto> {
    return ServicioEstablecimiento.aSalida(await this.archivarUC.ejecutar(id));
  }

  async restaurar(id: string): Promise<EstablecimientoSalidaDto> {
    return ServicioEstablecimiento.aSalida(await this.restaurarUC.ejecutar(id));
  }

  async fijarPrincipal(id: string): Promise<EstablecimientoSalidaDto> {
    return ServicioEstablecimiento.aSalida(
      await this.fijarPrincipalUC.ejecutar(id),
    );
  }

  private static aSalida(
    establecimiento: Establecimiento,
  ): EstablecimientoSalidaDto {
    return establecimiento.aPrimitivos();
  }
}
