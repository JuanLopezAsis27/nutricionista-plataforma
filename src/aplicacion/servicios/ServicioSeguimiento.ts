import type { RegistrarSuplemento } from "@/dominio/casos-de-uso/seguimiento/RegistrarSuplemento";
import type { ActualizarSuplemento } from "@/dominio/casos-de-uso/seguimiento/ActualizarSuplemento";
import type { EliminarSuplemento } from "@/dominio/casos-de-uso/seguimiento/EliminarSuplemento";
import type { ObtenerSuplementosDelPaciente } from "@/dominio/casos-de-uso/seguimiento/ObtenerSuplementosDelPaciente";
import type {
  GenerarAlertasDeSeguimiento,
  ResultadoGeneracion,
} from "@/dominio/casos-de-uso/seguimiento/GenerarAlertasDeSeguimiento";
import type { ObtenerAlertasPendientes } from "@/dominio/casos-de-uso/seguimiento/ObtenerAlertasPendientes";
import type { ContarAlertasPendientes } from "@/dominio/casos-de-uso/seguimiento/ContarAlertasPendientes";
import type { ResolverAlerta } from "@/dominio/casos-de-uso/seguimiento/ResolverAlerta";
import type { ObtenerInformeProgreso } from "@/dominio/casos-de-uso/seguimiento/ObtenerInformeProgreso";
import type { ObtenerInformeHabitos } from "@/dominio/casos-de-uso/seguimiento/ObtenerInformeHabitos";
import type { IUsuarioRepositorio } from "@/dominio/repositorios/IUsuarioRepositorio";
import type { IBusEventos } from "@/dominio/servicios/IBusEventos";
import type { Suplemento } from "@/dominio/entidades/Suplemento";
import type { AlertaSeguimiento } from "@/dominio/entidades/AlertaSeguimiento";
import type {
  RegistrarSuplementoDto,
  ActualizarSuplementoDto,
  ResolverAlertaDto,
  RangoInformeDto,
  SuplementoSalidaDto,
  AlertaSalidaDto,
  InformeProgresoSalidaDto,
  InformeHabitosSalidaDto,
} from "../dtos/seguimiento.dto";

/**
 * Servicio de aplicación de Seguimiento: suplementación, alertas
 * automáticas e informes de progreso/hábitos.
 */
export class ServicioSeguimiento {
  constructor(
    private readonly registrarSuplementoUC: RegistrarSuplemento,
    private readonly actualizarSuplementoUC: ActualizarSuplemento,
    private readonly eliminarSuplementoUC: EliminarSuplemento,
    private readonly obtenerSuplementosUC: ObtenerSuplementosDelPaciente,
    private readonly generarAlertasUC: GenerarAlertasDeSeguimiento,
    private readonly obtenerAlertasUC: ObtenerAlertasPendientes,
    private readonly contarAlertasUC: ContarAlertasPendientes,
    private readonly resolverAlertaUC: ResolverAlerta,
    private readonly informeProgresoUC: ObtenerInformeProgreso,
    private readonly informeHabitosUC: ObtenerInformeHabitos,
    private readonly usuarios: IUsuarioRepositorio,
    private readonly bus: IBusEventos,
  ) {}

  // --- Suplementos ---------------------------------------------------------

  async registrarSuplemento(datos: RegistrarSuplementoDto): Promise<SuplementoSalidaDto> {
    return ServicioSeguimiento.suplementoASalida(
      await this.registrarSuplementoUC.ejecutar(datos),
    );
  }

  async actualizarSuplemento(datos: ActualizarSuplementoDto): Promise<SuplementoSalidaDto> {
    return ServicioSeguimiento.suplementoASalida(
      await this.actualizarSuplementoUC.ejecutar(datos),
    );
  }

  async eliminarSuplemento(id: string): Promise<void> {
    await this.eliminarSuplementoUC.ejecutar(id);
  }

  async obtenerSuplementosDelPaciente(
    pacienteId: string,
    incluirInactivos = false,
  ): Promise<SuplementoSalidaDto[]> {
    const suplementos = await this.obtenerSuplementosUC.ejecutar(
      pacienteId,
      incluirInactivos,
    );
    return suplementos.map(ServicioSeguimiento.suplementoASalida);
  }

  // --- Alertas -------------------------------------------------------------

  async generarAlertas(): Promise<ResultadoGeneracion> {
    const resultado = await this.generarAlertasUC.ejecutar();
    // Notifica en tiempo real a los nutricionistas para que su campana se
    // actualice al instante (sin polling).
    if (resultado.generadas > 0) {
      const nutris = await this.usuarios.listarPorRol("NUTRICIONISTA");
      for (const nutri of nutris) {
        await this.bus.publicar({
          tipo: "alerta.nueva",
          usuarioId: nutri.id,
          datos: { generadas: resultado.generadas },
        });
      }
    }
    return resultado;
  }

  async obtenerAlertasPendientes(): Promise<AlertaSalidaDto[]> {
    const alertas = await this.obtenerAlertasUC.ejecutar();
    return alertas.map(ServicioSeguimiento.alertaASalida);
  }

  async contarAlertasPendientes(): Promise<number> {
    return this.contarAlertasUC.ejecutar();
  }

  async resolverAlerta(datos: ResolverAlertaDto): Promise<AlertaSalidaDto> {
    return ServicioSeguimiento.alertaASalida(await this.resolverAlertaUC.ejecutar(datos));
  }

  // --- Informes ------------------------------------------------------------

  async obtenerInformeProgreso(datos: RangoInformeDto): Promise<InformeProgresoSalidaDto> {
    return this.informeProgresoUC.ejecutar(datos.pacienteId, datos.desde, datos.hasta);
  }

  async obtenerInformeHabitos(datos: RangoInformeDto): Promise<InformeHabitosSalidaDto> {
    return this.informeHabitosUC.ejecutar(datos.pacienteId, datos.desde, datos.hasta);
  }

  private static suplementoASalida(suplemento: Suplemento): SuplementoSalidaDto {
    return suplemento.aPrimitivos();
  }

  private static alertaASalida(alerta: AlertaSeguimiento): AlertaSalidaDto {
    const { datos: _datos, ...resto } = alerta.aPrimitivos();
    return resto;
  }
}
