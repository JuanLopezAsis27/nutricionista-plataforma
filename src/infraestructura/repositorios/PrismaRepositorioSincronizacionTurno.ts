import type { PrismaClient } from "@prisma/client";
import type {
  ISincronizacionTurnoRepositorio,
  SincronizacionTurno,
} from "@/dominio/repositorios/ISincronizacionTurnoRepositorio";

/** Implementación con Prisma del mapeo turno ↔ evento de calendario. */
export class PrismaRepositorioSincronizacionTurno implements ISincronizacionTurnoRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async obtenerPorTurno(turnoId: string): Promise<SincronizacionTurno | null> {
    const fila = await this.prisma.sincronizacionTurno.findFirst({ where: { turnoId } });
    return fila
      ? { cuentaId: fila.cuentaId, turnoId: fila.turnoId, googleEventId: fila.googleEventId }
      : null;
  }

  async guardar(s: SincronizacionTurno): Promise<void> {
    const existente = await this.prisma.sincronizacionTurno.findFirst({
      where: { turnoId: s.turnoId },
    });
    if (existente) {
      await this.prisma.sincronizacionTurno.update({
        where: { id: existente.id },
        data: { cuentaId: s.cuentaId, googleEventId: s.googleEventId },
      });
    } else {
      await this.prisma.sincronizacionTurno.create({
        data: { cuentaId: s.cuentaId, turnoId: s.turnoId, googleEventId: s.googleEventId },
      });
    }
  }

  async eliminarPorTurno(turnoId: string): Promise<void> {
    await this.prisma.sincronizacionTurno.deleteMany({ where: { turnoId } });
  }
}
