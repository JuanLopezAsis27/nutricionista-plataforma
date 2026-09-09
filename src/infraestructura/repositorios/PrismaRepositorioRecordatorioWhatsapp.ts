import type {
  PrismaClient,
  RecordatorioWhatsapp as RecordatorioFila,
} from "@prisma/client";
import type {
  IRecordatorioWhatsappRepositorio,
  FiltroRecordatorios,
} from "@/dominio/repositorios/IRecordatorioWhatsappRepositorio";
import { RecordatorioWhatsapp } from "@/dominio/entidades/RecordatorioWhatsapp";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/**
 * Estados en los que todavía tiene sentido esperar una respuesta: el aviso
 * salió (o está por salir a mano) y el paciente aún no contestó. Un DESCARTADO
 * o un FALLIDO nunca llegaron, así que nada que entre después es respuesta a
 * ellos.
 */
const ESTADOS_A_LA_ESPERA: RecordatorioFila["estado"][] = [
  "PREPARADO",
  "ENVIADO",
  "ENTREGADO",
  "LEIDO",
];

/**
 * Implementación con Prisma del log de recordatorios por WhatsApp.
 *
 * No filtra por `nutricionistaId`: eso lo inyecta la extensión multi-inquilino
 * del cliente, igual que en el resto de los repositorios.
 */
export class PrismaRepositorioRecordatorioWhatsapp implements IRecordatorioWhatsappRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async registrar(
    recordatorio: RecordatorioWhatsapp,
  ): Promise<RecordatorioWhatsapp> {
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
        origen: d.origen,
        diasAntes: d.diasAntes,
        plantillaId: d.plantillaId,
        error: d.error,
        creadoEn: d.creadoEn,
        confirmadoEn: d.confirmadoEn,
        respondidoEn: d.respondidoEn,
      },
    });
    return mapearRecordatorioWhatsapp(fila);
  }

  async actualizar(
    recordatorio: RecordatorioWhatsapp,
  ): Promise<RecordatorioWhatsapp> {
    const d = recordatorio.aPrimitivos();
    const fila = await this.prisma.recordatorioWhatsapp.update({
      where: { id: d.id },
      // `mensaje`, `telefono` e `idExterno` entran porque el reintento de un
      // envío fallido reusa la fila (el índice único no deja insertar otra).
      data: {
        estado: d.estado,
        mensaje: d.mensaje,
        telefono: d.telefono,
        idExterno: d.idExterno,
        error: d.error,
        creadoEn: d.creadoEn,
        confirmadoEn: d.confirmadoEn,
        respondidoEn: d.respondidoEn,
      },
    });
    return mapearRecordatorioWhatsapp(fila);
  }

  async obtenerPorId(id: string): Promise<RecordatorioWhatsapp | null> {
    const fila = await this.prisma.recordatorioWhatsapp.findUnique({
      where: { id },
    });
    return fila ? mapearRecordatorioWhatsapp(fila) : null;
  }

  async obtenerPorIdExterno(
    idExterno: string,
  ): Promise<RecordatorioWhatsapp | null> {
    const fila = await this.prisma.recordatorioWhatsapp.findFirst({
      where: { idExterno },
    });
    return fila ? mapearRecordatorioWhatsapp(fila) : null;
  }

  async obtenerPorTurnoYDias(
    turnoId: string,
    diasAntes: number,
  ): Promise<RecordatorioWhatsapp | null> {
    const fila = await this.prisma.recordatorioWhatsapp.findFirst({
      where: { turnoId, diasAntes },
    });
    return fila ? mapearRecordatorioWhatsapp(fila) : null;
  }

  async porTurnos(
    turnoIds: string[],
  ): Promise<Map<string, RecordatorioWhatsapp[]>> {
    if (turnoIds.length === 0) return new Map();

    const filas = await this.prisma.recordatorioWhatsapp.findMany({
      where: { turnoId: { in: turnoIds } },
      orderBy: { creadoEn: "asc" },
    });

    const mapa = new Map<string, RecordatorioWhatsapp[]>();
    for (const fila of filas) {
      const acumulado = mapa.get(fila.turnoId) ?? [];
      acumulado.push(mapearRecordatorioWhatsapp(fila));
      mapa.set(fila.turnoId, acumulado);
    }
    return mapa;
  }

  async pendientesDeConfirmar(): Promise<RecordatorioWhatsapp[]> {
    const filas = await this.prisma.recordatorioWhatsapp.findMany({
      where: { estado: "PREPARADO" },
      orderBy: { creadoEn: "desc" },
    });
    return filas.map((fila) => mapearRecordatorioWhatsapp(fila));
  }

  async listar(
    filtro: FiltroRecordatorios = {},
  ): Promise<RecordatorioWhatsapp[]> {
    const filas = await this.prisma.recordatorioWhatsapp.findMany({
      where: {
        ...(filtro.desde ? { creadoEn: { gte: filtro.desde } } : {}),
        ...(filtro.pacienteId ? { pacienteId: filtro.pacienteId } : {}),
      },
      orderBy: { creadoEn: "desc" },
      take: filtro.limite ?? 100,
    });
    return filas.map((fila) => mapearRecordatorioWhatsapp(fila));
  }

  async sinRespuestaDePaciente(
    pacienteId: string,
  ): Promise<RecordatorioWhatsapp[]> {
    const filas = await this.prisma.recordatorioWhatsapp.findMany({
      where: {
        pacienteId,
        respondidoEn: null,
        estado: { in: ESTADOS_A_LA_ESPERA },
      },
      orderBy: { creadoEn: "desc" },
    });
    return filas.map((fila) => mapearRecordatorioWhatsapp(fila));
  }
}

export function mapearRecordatorioWhatsapp(
  fila: RecordatorioFila,
): RecordatorioWhatsapp {
  return RecordatorioWhatsapp.reconstruir({
    id: fila.id,
    turnoId: fila.turnoId,
    pacienteId: fila.pacienteId,
    telefono: fila.telefono,
    mensaje: fila.mensaje,
    estado: fila.estado,
    usuarioId: fila.usuarioId,
    idExterno: fila.idExterno,
    origen: fila.origen,
    diasAntes: fila.diasAntes,
    plantillaId: fila.plantillaId,
    error: fila.error,
    creadoEn: fila.creadoEn,
    confirmadoEn: fila.confirmadoEn,
    respondidoEn: fila.respondidoEn,
  });
}
