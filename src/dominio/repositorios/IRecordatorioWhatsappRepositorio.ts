import type { RecordatorioWhatsapp } from "../entidades/RecordatorioWhatsapp";

/** Criterios del historial de recordatorios que muestra la consola de envío. */
export interface FiltroRecordatorios {
  desde?: Date;
  pacienteId?: string;
  limite?: number;
}

/** Contrato de persistencia del log de recordatorios por WhatsApp. */
export interface IRecordatorioWhatsappRepositorio {
  registrar(recordatorio: RecordatorioWhatsapp): Promise<RecordatorioWhatsapp>;
  actualizar(recordatorio: RecordatorioWhatsapp): Promise<RecordatorioWhatsapp>;
  obtenerPorId(id: string): Promise<RecordatorioWhatsapp | null>;
  /** Busca por el wamid de Meta (webhook de estado con la API oficial). */
  obtenerPorIdExterno(idExterno: string): Promise<RecordatorioWhatsapp | null>;
  /**
   * El recordatorio de ese turno para ese escalón de la programación, si ya
   * existe. Es la consulta del barrido antes de mandar: la que evita repetirle
   * el aviso al paciente. La garantía dura la da el índice único; esto ahorra
   * el intento y deja distinguir "ya salió" de "falló y hay que reintentar".
   */
  obtenerPorTurnoYDias(
    turnoId: string,
    diasAntes: number,
  ): Promise<RecordatorioWhatsapp | null>;
  /**
   * TODOS los recordatorios de los turnos pedidos, agrupados por turno. La
   * consola de envío necesita ver los escalones ya cubiertos, no solo el
   * último: con [3, 1] programados, saber que salió el de 3 días no dice nada
   * sobre el de 1 día.
   */
  porTurnos(turnoIds: string[]): Promise<Map<string, RecordatorioWhatsapp[]>>;
  /**
   * Recordatorios sin resolver (PREPARADO): el chat se abrió y nadie confirmó
   * si el mensaje salió. Es la bandeja "pendientes de confirmar", y existe
   * porque el enlace wa.me no le devuelve nada a la app.
   */
  pendientesDeConfirmar(): Promise<RecordatorioWhatsapp[]>;
  /** Historial reciente, del más nuevo al más viejo. */
  listar(filtro?: FiltroRecordatorios): Promise<RecordatorioWhatsapp[]>;
  /**
   * Recordatorios que le salieron a un paciente y todavía no registraron
   * respuesta. Es lo que mira la ingesta de mensajes entrantes para marcar
   * RESPONDIDO cuando el paciente contesta.
   */
  sinRespuestaDePaciente(pacienteId: string): Promise<RecordatorioWhatsapp[]>;
}
