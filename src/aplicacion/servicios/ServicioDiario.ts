import type { GuardarDia } from "@/aplicacion/casos-de-uso/diario/GuardarDia";
import type { ObtenerDia } from "@/aplicacion/casos-de-uso/diario/ObtenerDia";
import type { ObtenerCalendarioDiario } from "@/aplicacion/casos-de-uso/diario/ObtenerCalendarioDiario";
import type { ObtenerRegistrosEnRango } from "@/aplicacion/casos-de-uso/diario/ObtenerRegistrosEnRango";
import type { AgregarComidaDiario } from "@/aplicacion/casos-de-uso/diario/AgregarComidaDiario";
import type { EliminarComidaDiario } from "@/aplicacion/casos-de-uso/diario/EliminarComidaDiario";
import type { AgregarActividadDiario } from "@/aplicacion/casos-de-uso/diario/AgregarActividadDiario";
import type { EliminarActividadDiario } from "@/aplicacion/casos-de-uso/diario/EliminarActividadDiario";
import type { AgregarFotoComida } from "@/aplicacion/casos-de-uso/diario/AgregarFotoComida";
import type { RegistroDiario } from "@/dominio/entidades/RegistroDiario";
import type {
  GuardarDiaDto,
  AgregarComidaDto,
  AgregarActividadDto,
  RegistroDiarioSalidaDto,
  DiaCalendarioDto,
} from "../dtos/diario.dto";

/**
 * Servicio de aplicación del Diario del paciente.
 * El pacienteId llega siempre resuelto por la capa de presentación
 * (de la sesión en el portal; del input en las vistas del nutricionista).
 */
export class ServicioDiario {
  constructor(
    private readonly guardarDiaUC: GuardarDia,
    private readonly obtenerDiaUC: ObtenerDia,
    private readonly obtenerCalendarioUC: ObtenerCalendarioDiario,
    private readonly obtenerRangoUC: ObtenerRegistrosEnRango,
    private readonly agregarComidaUC: AgregarComidaDiario,
    private readonly eliminarComidaUC: EliminarComidaDiario,
    private readonly agregarActividadUC: AgregarActividadDiario,
    private readonly eliminarActividadUC: EliminarActividadDiario,
    private readonly agregarFotoUC: AgregarFotoComida,
  ) {}

  async guardarDia(
    pacienteId: string,
    datos: GuardarDiaDto,
  ): Promise<RegistroDiarioSalidaDto> {
    const registro = await this.guardarDiaUC.ejecutar({ pacienteId, ...datos });
    return ServicioDiario.aSalida(registro);
  }

  async obtenerDia(
    pacienteId: string,
    fecha: Date,
  ): Promise<RegistroDiarioSalidaDto | null> {
    const registro = await this.obtenerDiaUC.ejecutar(pacienteId, fecha);
    return registro ? ServicioDiario.aSalida(registro) : null;
  }

  async obtenerCalendario(
    pacienteId: string,
    anio: number,
    mes: number,
  ): Promise<DiaCalendarioDto[]> {
    return this.obtenerCalendarioUC.ejecutar(pacienteId, anio, mes);
  }

  async obtenerRango(
    pacienteId: string,
    desde: Date,
    hasta: Date,
  ): Promise<RegistroDiarioSalidaDto[]> {
    const registros = await this.obtenerRangoUC.ejecutar(
      pacienteId,
      desde,
      hasta,
    );
    return registros.map(ServicioDiario.aSalida);
  }

  async agregarComida(
    pacienteId: string,
    datos: AgregarComidaDto,
  ): Promise<RegistroDiarioSalidaDto> {
    const { fecha, ...comida } = datos;
    const registro = await this.agregarComidaUC.ejecutar(
      pacienteId,
      fecha,
      comida,
    );
    return ServicioDiario.aSalida(registro);
  }

  async eliminarComida(pacienteId: string, comidaId: string): Promise<void> {
    await this.eliminarComidaUC.ejecutar(pacienteId, comidaId);
  }

  async agregarActividad(
    pacienteId: string,
    datos: AgregarActividadDto,
  ): Promise<RegistroDiarioSalidaDto> {
    const { fecha, ...actividad } = datos;
    const registro = await this.agregarActividadUC.ejecutar(
      pacienteId,
      fecha,
      actividad,
    );
    return ServicioDiario.aSalida(registro);
  }

  async eliminarActividad(
    pacienteId: string,
    actividadId: string,
  ): Promise<void> {
    await this.eliminarActividadUC.ejecutar(pacienteId, actividadId);
  }

  async agregarFotoComida(
    pacienteId: string,
    comidaId: string,
    archivoId: string,
  ): Promise<void> {
    await this.agregarFotoUC.ejecutar(pacienteId, comidaId, archivoId);
  }

  private static aSalida(registro: RegistroDiario): RegistroDiarioSalidaDto {
    return registro.aPrimitivos();
  }
}
