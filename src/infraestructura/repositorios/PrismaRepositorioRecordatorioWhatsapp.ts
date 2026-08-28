import type {
  PrismaClient,
  RecordatorioWhatsapp as RecordatorioFila,
} from "@prisma/client";
import type { IRecordatorioWhatsappRepositorio } from "@/dominio/repositorios/IRecordatorioWhatsappRepositorio";
import { RecordatorioWhatsapp } from "@/dominio/entidades/RecordatorioWhatsapp";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/**
 * Implementación con Prisma del log de recordatorios por WhatsApp.
 *
 * No filtra por `nutricionistaId`: eso lo inyecta la extensión multi-inquilino
 * del cliente, igual que en el resto de los repositorios.
 */
export class PrismaRepositorioRecordatorioWhatsapp implements IRecordatorioWhatsappRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async registrar(recordatorio: RecordatorioWhatsapp): Promise<RecordatorioWhatsapp> {
    const d = recordatorio.aPrimitivos();
    const fila = await this.prisma.recordatorioWhatsapp.create({
      data: {
        nutricionistaId: inquilinoActual(),
        id: d.id,
        turnoId: d.turnoId,
        pacienteId: d.pacienteId,
        telefono: d.telefono,
        mensaje: d.mensaje,
        estado: d.estado,
        usuarioId: d.usuarioId,
        idExterno: d.idExterno,
        creadoEn: d.creadoEn,
        confirmadoEn: d.confirmadoEn,
      },
    });
    return this.mapear(fila);
  }

  async actualizar(recordatorio: RecordatorioWhatsapp): Promise<RecordatorioWhatsapp> {
    const d = recordatorio.aPrimitivos();
    const fila = await this.prisma.recordatorioWhatsapp.update({
      where: { id: d.id },
      data: { estado: d.estado, confirmadoEn: d.confirmadoEn },
    });
    return this.mapear(fila);
  }

  async obtenerPorId(id: string): Promise<RecordatorioWhatsapp | null> {
    const fila = await this.prisma.recordatorioWhatsapp.findUnique({ where: { id } });
    return fila ? this.mapear(fila) : null;
  }

  async obtenerPorIdExterno(idExterno: string): Promise<RecordatorioWhatsapp | null> {
    const fila = await this.prisma.recordatorioWhatsapp.findFirst({ where: { idExterno } });
    return fila ? this.mapear(fila) : null;
  }

  async ultimosPorTurnos(turnoIds: string[]): Promise<Map<string, RecordatorioWhatsapp>> {
    const filas = await this.prisma.recordatorioWhatsapp.findMany({
      where: { turnoId: { in: turnoIds } },
      orderBy: { creadoEn: "desc" },
    });

    // Ordenadas de más nueva a más vieja: la primera de cada turno es la última.
    const mapa = new Map<string, RecordatorioWhatsapp>();
    for (const fila of filas) {
      if (!mapa.has(fila.turnoId)) {
        mapa.set(fila.turnoId, this.mapear(fila));
      }
    }
    return mapa;
  }

  private mapear(fila: RecordatorioFila): RecordatorioWhatsapp {
    return RecordatorioWhatsapp.reconstruir({
      id: fila.id,
      turnoId: fila.turnoId,
      pacienteId: fila.pacienteId,
      telefono: fila.telefono,
      mensaje: fila.mensaje,
      estado: fila.estado,
      usuarioId: fila.usuarioId,
      idExterno: fila.idExterno,
      creadoEn: fila.creadoEn,
      confirmadoEn: fila.confirmadoEn,
    });
  }
}
