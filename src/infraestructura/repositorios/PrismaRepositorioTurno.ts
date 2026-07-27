import type { PrismaClient, Turno as TurnoFila, Prisma } from "@prisma/client";
import type {
  ITurnoRepositorio,
  FiltroTurnos,
} from "@/dominio/repositorios/ITurnoRepositorio";
import { Turno, type EstadoTurno } from "@/dominio/entidades/Turno";

/**
 * Implementación con Prisma del repositorio de Turno.
 * Intercambiable con cualquier otra implementación (LSP).
 */
export class PrismaRepositorioTurno implements ITurnoRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(turno: Turno): Promise<Turno> {
    const datos = turno.aPrimitivos();
    const fila = await this.prisma.turno.create({
      data: {
        id: datos.id,
        pacienteId: datos.pacienteId,
        fecha: this.soloFecha(datos.fecha),
        hora: datos.hora,
        duracionMinutos: datos.duracionMinutos,
        estado: datos.estado,
        notas: datos.notas,
        precio: datos.precio,
        pagado: datos.pagado,
        creadoEn: datos.creadoEn,
      },
    });
    return this.mapearATurno(fila);
  }

  async actualizar(turno: Turno): Promise<Turno> {
    const datos = turno.aPrimitivos();
    const fila = await this.prisma.turno.update({
      where: { id: datos.id },
      data: {
        pacienteId: datos.pacienteId,
        fecha: this.soloFecha(datos.fecha),
        hora: datos.hora,
        duracionMinutos: datos.duracionMinutos,
        estado: datos.estado,
        notas: datos.notas,
        precio: datos.precio,
        pagado: datos.pagado,
      },
    });
    return this.mapearATurno(fila);
  }

  async obtenerPorId(id: string): Promise<Turno | null> {
    const fila = await this.prisma.turno.findUnique({ where: { id } });
    return fila ? this.mapearATurno(fila) : null;
  }

  async obtenerEnFecha(fecha: Date): Promise<Turno[]> {
    const filas = await this.prisma.turno.findMany({
      where: { fecha: this.soloFecha(fecha) },
      orderBy: [{ hora: "asc" }],
    });
    return filas.map((fila) => this.mapearATurno(fila));
  }

  async obtenerPorPaciente(pacienteId: string): Promise<Turno[]> {
    const filas = await this.prisma.turno.findMany({
      where: { pacienteId },
      orderBy: [{ fecha: "desc" }, { hora: "desc" }],
    });
    return filas.map((fila) => this.mapearATurno(fila));
  }

  async listar(filtro: FiltroTurnos = {}): Promise<Turno[]> {
    const where: Prisma.TurnoWhereInput = {};
    if (filtro.fecha) where.fecha = this.soloFecha(filtro.fecha);
    if (filtro.estado) where.estado = filtro.estado;
    if (filtro.pacienteId) where.pacienteId = filtro.pacienteId;

    const filas = await this.prisma.turno.findMany({
      where,
      orderBy: [{ fecha: "asc" }, { hora: "asc" }],
    });
    return filas.map((fila) => this.mapearATurno(fila));
  }

  /** Normaliza una fecha a medianoche UTC (coherente con la columna @db.Date). */
  private soloFecha(fecha: Date): Date {
    return new Date(
      Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()),
    );
  }

  /** Mapea una fila de Prisma a la entidad de dominio Turno. */
  private mapearATurno(fila: TurnoFila): Turno {
    return Turno.reconstruir({
      id: fila.id,
      pacienteId: fila.pacienteId,
      fecha: fila.fecha,
      hora: fila.hora,
      duracionMinutos: fila.duracionMinutos,
      estado: fila.estado as EstadoTurno,
      notas: fila.notas,
      // Decimal nunca cruza infraestructura: se mapea a number.
      precio: fila.precio == null ? null : Number(fila.precio),
      pagado: fila.pagado,
      creadoEn: fila.creadoEn,
    });
  }
}
