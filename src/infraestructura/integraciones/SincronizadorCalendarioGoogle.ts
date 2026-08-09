import type {
  ISincronizadorCalendario,
  DatosTurnoSync,
} from "@/dominio/servicios/ISincronizadorCalendario";
import type { ICuentaConectadaRepositorio } from "@/dominio/repositorios/ICuentaConectadaRepositorio";
import type { ISincronizacionTurnoRepositorio } from "@/dominio/repositorios/ISincronizacionTurnoRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IProveedorGoogle, EventoCalendario } from "@/dominio/servicios/IProveedorGoogle";
import { obtenerAccessTokenValido } from "./tokenGoogle";

/**
 * Sincroniza los turnos con Google Calendar (una vía: app → Google). Best-effort
 * a rajatabla: si el nutricionista no tiene Google conectado, o Google falla, no
 * hace nada (loguea) y NUNCA propaga el error a la operación del turno.
 */
export class SincronizadorCalendarioGoogle implements ISincronizadorCalendario {
  constructor(
    private readonly cuentas: ICuentaConectadaRepositorio,
    private readonly sincronizaciones: ISincronizacionTurnoRepositorio,
    private readonly proveedor: IProveedorGoogle,
    private readonly pacientes: IPacienteRepositorio,
  ) {}

  async alAgendar(turno: DatosTurnoSync): Promise<void> {
    await this.intentar(async () => {
      const cuenta = await this.cuentas.obtener("GOOGLE");
      if (!cuenta) return;
      const token = await obtenerAccessTokenValido(cuenta, this.cuentas, this.proveedor);
      const eventoId = await this.proveedor.crearEvento(token, await this.construir(turno));
      await this.sincronizaciones.guardar({
        cuentaId: cuenta.id,
        turnoId: turno.id,
        googleEventId: eventoId,
      });
    });
  }

  async alReprogramar(turno: DatosTurnoSync): Promise<void> {
    await this.intentar(async () => {
      const cuenta = await this.cuentas.obtener("GOOGLE");
      if (!cuenta) return;
      const token = await obtenerAccessTokenValido(cuenta, this.cuentas, this.proveedor);
      const existente = await this.sincronizaciones.obtenerPorTurno(turno.id);
      const evento = await this.construir(turno);
      if (existente) {
        await this.proveedor.actualizarEvento(token, existente.googleEventId, evento);
      } else {
        const eventoId = await this.proveedor.crearEvento(token, evento);
        await this.sincronizaciones.guardar({
          cuentaId: cuenta.id,
          turnoId: turno.id,
          googleEventId: eventoId,
        });
      }
    });
  }

  async alCancelar(turnoId: string): Promise<void> {
    await this.intentar(async () => {
      const existente = await this.sincronizaciones.obtenerPorTurno(turnoId);
      if (!existente) return;
      const cuenta = await this.cuentas.obtener("GOOGLE");
      if (!cuenta) return;
      const token = await obtenerAccessTokenValido(cuenta, this.cuentas, this.proveedor);
      await this.proveedor.eliminarEvento(token, existente.googleEventId);
      await this.sincronizaciones.eliminarPorTurno(turnoId);
    });
  }

  private async construir(turno: DatosTurnoSync): Promise<EventoCalendario> {
    // La fecha del turno es la medianoche UTC del día; la hora es local (AR,
    // UTC-3, sin DST) → el instante UTC del inicio es (hora + 3) UTC.
    const [h, m] = turno.hora.split(":").map(Number);
    const inicio = new Date(turno.fecha);
    inicio.setUTCHours((h ?? 0) + 3, m ?? 0, 0, 0);
    const fin = new Date(inicio.getTime() + turno.duracionMinutos * 60_000);

    const paciente = await this.pacientes.obtenerPorId(turno.pacienteId);
    const nombre = paciente ? paciente.nombreCompleto : "paciente";
    return {
      titulo: `Turno — ${nombre}`,
      descripcion: "Turno agendado desde la app del consultorio.",
      inicio,
      fin,
    };
  }

  private async intentar(fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (error) {
      console.error("[calendar] no se pudo sincronizar el turno con Google:", error);
    }
  }
}
