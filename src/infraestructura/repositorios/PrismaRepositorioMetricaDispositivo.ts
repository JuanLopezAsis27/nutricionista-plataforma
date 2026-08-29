import type { PrismaClient, Prisma } from "@prisma/client";
import type { IMetricaDispositivoRepositorio } from "@/dominio/repositorios/IMetricaDispositivoRepositorio";
import { MetricaDispositivo } from "@/dominio/entidades/MetricaDispositivo";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

type FilaMetrica = Prisma.MetricaDispositivoGetPayload<Record<string, never>>;

/** Decimal (o null) → number (o null). El Decimal nunca cruza a capas altas. */
function aNumero(valor: Prisma.Decimal | null): number | null {
  return valor === null ? null : Number(valor);
}

/** Solo la parte de la fecha (UTC), para el índice único por día. */
function soloFecha(fecha: Date): Date {
  return new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
}

/**
 * Implementación con Prisma del repositorio de métricas de dispositivo.
 * `guardar` hace upsert por (paciente, fecha, fuente) y NO pisa el opt-in
 * (`incluir`) al reimportar. El `nutricionistaId` lo inyecta la extensión de
 * multi-inquilino.
 */
export class PrismaRepositorioMetricaDispositivo implements IMetricaDispositivoRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async guardar(metrica: MetricaDispositivo): Promise<void> {
    const d = metrica.aPrimitivos();
    const fecha = soloFecha(d.fecha);
    await this.prisma.metricaDispositivo.upsert({
      where: {
        pacienteId_fecha_fuente: { pacienteId: d.pacienteId, fecha, fuente: d.fuente },
      },
      create: {
        id: d.id,
        nutricionistaId: inquilinoActual(),
        pacienteId: d.pacienteId,
        fecha,
        fuente: d.fuente,
        pasos: d.pasos,
        minutosActividad: d.minutosActividad,
        caloriasActivas: d.caloriasActivas,
        frecuenciaCardiacaReposo: d.frecuenciaCardiacaReposo,
        horasSueno: d.horasSueno,
        incluir: d.incluir,
        creadoEn: d.creadoEn,
        actualizadoEn: d.actualizadoEn,
      },
      // No se toca `incluir`: la elección del paciente se conserva al reimportar.
      update: {
        pasos: d.pasos,
        minutosActividad: d.minutosActividad,
        caloriasActivas: d.caloriasActivas,
        frecuenciaCardiacaReposo: d.frecuenciaCardiacaReposo,
        horasSueno: d.horasSueno,
      },
    });
  }

  async listarPorRango(
    pacienteId: string,
    desde: Date,
    hasta: Date,
  ): Promise<MetricaDispositivo[]> {
    const filas = await this.prisma.metricaDispositivo.findMany({
      where: { pacienteId, fecha: { gte: soloFecha(desde), lte: soloFecha(hasta) } },
      orderBy: { fecha: "asc" },
    });
    return filas.map((fila) => this.mapear(fila));
  }

  async fijarInclusion(pacienteId: string, fecha: Date, incluir: boolean): Promise<void> {
    await this.prisma.metricaDispositivo.updateMany({
      where: { pacienteId, fecha: soloFecha(fecha) },
      data: { incluir },
    });
  }

  private mapear(fila: FilaMetrica): MetricaDispositivo {
    return MetricaDispositivo.reconstruir({
      id: fila.id,
      pacienteId: fila.pacienteId,
      fecha: fila.fecha,
      fuente: fila.fuente,
      pasos: fila.pasos,
      minutosActividad: fila.minutosActividad,
      caloriasActivas: fila.caloriasActivas,
      frecuenciaCardiacaReposo: fila.frecuenciaCardiacaReposo,
      horasSueno: aNumero(fila.horasSueno),
      incluir: fila.incluir,
      creadoEn: fila.creadoEn,
      actualizadoEn: fila.actualizadoEn,
    });
  }
}
