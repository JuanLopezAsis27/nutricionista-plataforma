import type { PrismaClient, Prisma } from "@prisma/client";
import type { IAlertaSeguimientoRepositorio } from "@/dominio/repositorios/IAlertaSeguimientoRepositorio";
import { AlertaSeguimiento } from "@/dominio/entidades/AlertaSeguimiento";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

const INCLUIR_PACIENTE = {
  paciente: { select: { nombre: true, apellido: true } },
} satisfies Prisma.AlertaSeguimientoInclude;

type AlertaConPaciente = Prisma.AlertaSeguimientoGetPayload<{
  include: typeof INCLUIR_PACIENTE;
}>;

/**
 * Implementación con Prisma del repositorio de Alertas de Seguimiento.
 * `crearSiNoExistePendiente` es idempotente por (paciente, tipo, referencia):
 * el cron diario puede correr las veces que haga falta sin duplicar avisos.
 */
export class PrismaRepositorioAlertaSeguimiento implements IAlertaSeguimientoRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crearSiNoExistePendiente(alerta: AlertaSeguimiento): Promise<boolean> {
    const d = alerta.aPrimitivos();
    return this.prisma.$transaction(async (tx) => {
      const existente = await tx.alertaSeguimiento.findFirst({
        where: {
          pacienteId: d.pacienteId,
          tipo: d.tipo,
          estado: "PENDIENTE",
          referenciaId: d.referenciaId,
        },
        select: { id: true },
      });
      if (existente) return false;

      await tx.alertaSeguimiento.create({
        data: {
          nutricionistaId: inquilinoActual(),
          id: d.id,
          pacienteId: d.pacienteId,
          tipo: d.tipo,
          estado: d.estado,
          detalle: d.detalle,
          referenciaId: d.referenciaId,
          datos: (d.datos ?? undefined) as Prisma.InputJsonValue | undefined,
          creadoEn: d.creadoEn,
        },
      });
      return true;
    });
  }

  async actualizar(alerta: AlertaSeguimiento): Promise<AlertaSeguimiento> {
    const d = alerta.aPrimitivos();
    const fila = await this.prisma.alertaSeguimiento.update({
      where: { id: d.id },
      data: { estado: d.estado, resueltaEn: d.resueltaEn },
      include: INCLUIR_PACIENTE,
    });
    return this.mapear(fila);
  }

  async obtenerPorId(id: string): Promise<AlertaSeguimiento | null> {
    const fila = await this.prisma.alertaSeguimiento.findUnique({
      where: { id },
      include: INCLUIR_PACIENTE,
    });
    return fila ? this.mapear(fila) : null;
  }

  async listarPendientes(): Promise<AlertaSeguimiento[]> {
    const filas = await this.prisma.alertaSeguimiento.findMany({
      where: { estado: "PENDIENTE" },
      include: INCLUIR_PACIENTE,
      orderBy: { creadoEn: "desc" },
    });
    return filas.map((fila) => this.mapear(fila));
  }

  async contarPendientes(): Promise<number> {
    return this.prisma.alertaSeguimiento.count({
      where: { estado: "PENDIENTE" },
    });
  }

  private mapear(fila: AlertaConPaciente): AlertaSeguimiento {
    return AlertaSeguimiento.reconstruir({
      id: fila.id,
      pacienteId: fila.pacienteId,
      pacienteNombre: `${fila.paciente.nombre} ${fila.paciente.apellido}`,
      tipo: fila.tipo,
      estado: fila.estado,
      detalle: fila.detalle,
      referenciaId: fila.referenciaId,
      datos: (fila.datos as Record<string, unknown> | null) ?? null,
      creadoEn: fila.creadoEn,
      resueltaEn: fila.resueltaEn,
    });
  }
}
