import type { CrearCuentaNutricionista } from "@/dominio/casos-de-uso/superadmin/CrearCuentaNutricionista";
import type { ListarNutricionistas } from "@/dominio/casos-de-uso/superadmin/ListarNutricionistas";
import type { CambiarEstadoNutricionista } from "@/dominio/casos-de-uso/superadmin/CambiarEstadoNutricionista";
import type { Usuario } from "@/dominio/entidades/Usuario";
import type {
  CrearCuentaNutricionistaDto,
  NutricionistaSalidaDto,
} from "../dtos/superadmin.dto";

/**
 * Servicio de aplicación del SuperAdmin: alta y gestión de las cuentas de
 * nutricionista (cada una es un inquilino con sus pacientes y config).
 */
export class ServicioSuperAdmin {
  constructor(
    private readonly crearUC: CrearCuentaNutricionista,
    private readonly listarUC: ListarNutricionistas,
    private readonly cambiarEstadoUC: CambiarEstadoNutricionista,
  ) {}

  async crearNutricionista(
    datos: CrearCuentaNutricionistaDto,
  ): Promise<NutricionistaSalidaDto> {
    return ServicioSuperAdmin.aSalida(await this.crearUC.ejecutar(datos));
  }

  async listarNutricionistas(): Promise<NutricionistaSalidaDto[]> {
    return (await this.listarUC.ejecutar()).map(ServicioSuperAdmin.aSalida);
  }

  async cambiarEstado(
    id: string,
    activo: boolean,
  ): Promise<NutricionistaSalidaDto> {
    return ServicioSuperAdmin.aSalida(
      await this.cambiarEstadoUC.ejecutar(id, activo),
    );
  }

  private static aSalida(usuario: Usuario): NutricionistaSalidaDto {
    const d = usuario.aPrimitivos();
    return { id: d.id, email: d.email, activo: d.activo, creadoEn: d.creadoEn };
  }
}
