import type { PrismaClient, Turno as TurnoFila, Prisma } from "@prisma/client";
import type {
  ITurnoRepositorio,
  FiltroTurnos,
} from "@/dominio/repositorios/ITurnoRepositorio";
import { Turno, type EstadoTurno } from "@/dominio/entidades/Turno";
import { ErrorTurnoConflicto } from "@/dominio/errores/ErrorTurnoConflicto";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/** Nombre del EXCLUDE que impide dos turnos superpuestos (migración 27). */
const RESTRICCION_SOLAPAMIENTO = "turnos_sin_solapamiento";

/**
 * Traduce la violación del EXCLUDE de Postgres al error del dominio.
 *
 * El caso de uso ya comprueba el solapamiento leyendo los turnos del día, pero
 * esa comprobación es un leer-y-después-escribir: dos altas concurrentes la
 * pasan las dos. La garantía de verdad es la restricción del motor, y este es
 * el punto donde su error deja de ser un detalle de Postgres.
 */
function comoConflicto(error: unknown, fecha: Date, hora: string): never {
  const mensaje = error instanceof Error ? error.message : String(error);
  if (mensaje.includes(RESTRICCION_SOLAPAMIENTO) || mensaje.includes("23P01")) {
    throw new ErrorTurnoConflicto(fecha.toISOString().slice(0, 10), hora);
  }
  throw error;
}

/**
 * Implementación con Prisma del repositorio de Turno.
 * Intercambiable con cualquier otra implementación (LSP).
 */
export class PrismaRepositorioTurno implements ITurnoRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(turno: Turno): Promise<Turno> {
    const datos = turno.aPrimitivos();
    try {
      const fila = await this.prisma.turno.create({
        data: {
          nutricionistaId: inquilinoActual(),
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
    } catch (error) {
      comoConflicto(error, datos.fecha, datos.hora);
    }
  }

  async actualizar(turno: Turno): Promise<Turno> {
    const datos = turno.aPrimitivos();
    try {
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
    } catch (error) {
      comoConflicto(error, datos.fecha, datos.hora);
    }
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
