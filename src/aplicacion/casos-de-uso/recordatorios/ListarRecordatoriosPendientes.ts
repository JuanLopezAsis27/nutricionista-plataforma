import type { IRecordatorioWhatsappRepositorio } from "@/dominio/repositorios/IRecordatorioWhatsappRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import { construirEnlaceWhatsapp } from "../whatsapp/enlace";

/** Un recordatorio abierto en WhatsApp del que todavía no se sabe si salió. */
export interface RecordatorioPendiente {
  recordatorioId: string;
  pacienteId: string;
  nombrePaciente: string;
  turnoId: string;
  fechaTurno: Date | null;
  horaTurno: string | null;
  mensaje: string;
  telefono: string;
  /** Enlace para volver a abrir ese chat con el mismo texto. */
  enlace: string;
  abiertoEn: Date;
}

/**
 * Caso de uso: los recordatorios que quedaron sin confirmar.
 *
 * Es la contracara del enlace `wa.me`: la app arma el mensaje y abre el chat,
 * pero WhatsApp no le devuelve nada, así que el envío lo declara el
 * profesional. Sin esta bandeja esa confirmación no tenía dónde ocurrir una
 * vez cerrado el diálogo del envío, y el aviso quedaba colgado en PREPARADO
 * para siempre — ni enviado ni descartado.
 *
 * El enlace se rearma acá y no se persiste: el texto guardado es la fuente de
 * verdad, y guardar además la URL sería lo mismo dicho dos veces, con la
 * garantía de que un día discrepan.
 */
export class ListarRecordatoriosPendientes {
  constructor(
    private readonly recordatorios: IRecordatorioWhatsappRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly turnos: ITurnoRepositorio,
  ) {}

  async ejecutar(): Promise<RecordatorioPendiente[]> {
    const pendientes = await this.recordatorios.pendientesDeConfirmar();
    if (pendientes.length === 0) return [];

    // Pacientes y turnos de toda la bandeja en dos consultas, no dos por fila.
    const [pacientes, turnos] = await Promise.all([
      this.pacientes.obtenerPorIds([
        ...new Set(pendientes.map((r) => r.pacienteId)),
      ]),
      this.turnos.obtenerPorIds([...new Set(pendientes.map((r) => r.turnoId))]),
    ]);
    const pacientePorId = new Map(pacientes.map((p) => [p.id, p]));
    const turnoPorId = new Map(turnos.map((t) => [t.id, t]));
    const salida: RecordatorioPendiente[] = [];

    for (const recordatorio of pendientes) {
      const datos = recordatorio.aPrimitivos();
      const paciente = pacientePorId.get(datos.pacienteId);
      if (!paciente) continue;

      const turno = turnoPorId.get(datos.turnoId);
      // El turno que se canceló después de preparar el aviso ya no necesita
      // recordatorio: mostrarlo sería invitar a mandar un mensaje equivocado.
      if (
        turno &&
        turno.estado !== "PENDIENTE" &&
        turno.estado !== "CONFIRMADO"
      )
        continue;

      salida.push({
        recordatorioId: datos.id,
        pacienteId: paciente.id,
        nombrePaciente: paciente.nombreCompleto,
        turnoId: datos.turnoId,
        fechaTurno: turno?.fecha ?? null,
        horaTurno: turno?.hora ?? null,
        mensaje: datos.mensaje,
        telefono: datos.telefono,
        enlace: construirEnlaceWhatsapp(datos.telefono, datos.mensaje),
        abiertoEn: datos.creadoEn,
      });
    }

    return salida;
  }
}
