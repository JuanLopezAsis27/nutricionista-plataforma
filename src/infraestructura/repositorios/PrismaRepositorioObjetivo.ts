import type { PrismaClient, Prisma } from "@prisma/client";
import type {
  IObjetivoRepositorio,
  DatosEventoObjetivo,
} from "@/dominio/repositorios/IObjetivoRepositorio";
import {
  Objetivo,
  type EstrategiaObjetivo,
  type EventoObjetivo,
  type EstadoEstrategia,
  type TipoEventoObjetivo,
} from "@/dominio/entidades/Objetivo";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/** Include estándar: estrategias más recientes primero. */
const INCLUIR_ESTRATEGIAS = {
  estrategias: { orderBy: { creadoEn: "desc" } },
} satisfies Prisma.ObjetivoInclude;

type ObjetivoConEstrategias = Prisma.ObjetivoGetPayload<{
  include: typeof INCLUIR_ESTRATEGIAS;
}>;

/**
 * Implementación con Prisma del repositorio de Objetivos.
 * Cada mutación persiste su evento de historial en la MISMA transacción:
 * la auditoría nunca queda desincronizada del cambio.
 */
export class PrismaRepositorioObjetivo implements IObjetivoRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(objetivo: Objetivo, evento: DatosEventoObjetivo): Promise<Objetivo> {
    const d = objetivo.aPrimitivos();
    const fila = await this.prisma.$transaction(async (tx) => {
      await tx.objetivo.create({
        data: {
          nutricionistaId: inquilinoActual(),
          id: d.id,
          pacienteId: d.pacienteId,
          titulo: d.titulo,
          descripcion: d.descripcion,
          prioridad: d.prioridad,
          estado: d.estado,
          fechaObjetivo: d.fechaObjetivo ? this.soloFecha(d.fechaObjetivo) : null,
          creadoEn: d.creadoEn,
          actualizadoEn: d.actualizadoEn,
        },
      });
      await this.registrarEvento(tx, d.id, evento);
      return tx.objetivo.findUniqueOrThrow({
        where: { id: d.id },
        include: INCLUIR_ESTRATEGIAS,
      });
    });
    return this.mapear(fila);
  }

  async actualizar(objetivo: Objetivo, evento: DatosEventoObjetivo): Promise<Objetivo> {
    const d = objetivo.aPrimitivos();
    const fila = await this.prisma.$transaction(async (tx) => {
      await tx.objetivo.update({
        where: { id: d.id },
        data: {
          titulo: d.titulo,
          descripcion: d.descripcion,
          prioridad: d.prioridad,
          estado: d.estado,
          fechaObjetivo: d.fechaObjetivo ? this.soloFecha(d.fechaObjetivo) : null,
        },
      });
      await this.registrarEvento(tx, d.id, evento);
      return tx.objetivo.findUniqueOrThrow({
        where: { id: d.id },
        include: INCLUIR_ESTRATEGIAS,
      });
    });
    return this.mapear(fila);
  }

  async eliminar(id: string): Promise<void> {
    // Estrategias e historial caen en cascada (ver schema.prisma).
    await this.prisma.objetivo.delete({ where: { id } });
  }

  async obtenerPorId(id: string): Promise<Objetivo | null> {
    const fila = await this.prisma.objetivo.findUnique({
      where: { id },
      include: INCLUIR_ESTRATEGIAS,
    });
    return fila ? this.mapear(fila) : null;
  }

  async listarPorPaciente(pacienteId: string): Promise<Objetivo[]> {
    const filas = await this.prisma.objetivo.findMany({
      where: { pacienteId },
      include: INCLUIR_ESTRATEGIAS,
      orderBy: { creadoEn: "desc" },
    });
    return filas.map((fila) => this.mapear(fila));
  }

  async agregarEstrategia(
    objetivoId: string,
    estrategia: EstrategiaObjetivo,
    evento: DatosEventoObjetivo,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.estrategia.create({
        data: {
          nutricionistaId: inquilinoActual(),
          id: estrategia.id,
          objetivoId,
          descripcion: estrategia.descripcion,
          motivo: estrategia.motivo,
          estado: estrategia.estado,
          creadoEn: estrategia.creadoEn,
        },
      });
      await this.registrarEvento(tx, objetivoId, evento);
    });
  }

  async actualizarEstrategia(
    objetivoId: string,
    estrategia: EstrategiaObjetivo,
    evento: DatosEventoObjetivo,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.estrategia.update({
        where: { id: estrategia.id },
        data: {
          descripcion: estrategia.descripcion,
          motivo: estrategia.motivo,
          estado: estrategia.estado,
        },
      });
      await this.registrarEvento(tx, objetivoId, evento);
    });
  }

  async eliminarEstrategia(
    objetivoId: string,
    estrategiaId: string,
    evento: DatosEventoObjetivo,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.estrategia.delete({ where: { id: estrategiaId } });
      await this.registrarEvento(tx, objetivoId, evento);
    });
  }

  async listarHistorial(objetivoId: string): Promise<EventoObjetivo[]> {
    const filas = await this.prisma.historialObjetivo.findMany({
      where: { objetivoId },
      orderBy: { creadoEn: "desc" },
    });
    return filas.map((fila) => ({
      id: fila.id,
      tipo: fila.tipo as TipoEventoObjetivo,
      detalle: fila.detalle,
      motivo: fila.motivo,
      creadoEn: fila.creadoEn,
    }));
  }

  private async registrarEvento(
    tx: Prisma.TransactionClient,
    objetivoId: string,
    evento: DatosEventoObjetivo,
  ): Promise<void> {
    await tx.historialObjetivo.create({
      data: {
        nutricionistaId: inquilinoActual(),
        objetivoId,
        tipo: evento.tipo,
        detalle: evento.detalle,
        motivo: evento.motivo ?? null,
      },
    });
  }

  private soloFecha(fecha: Date): Date {
    return new Date(
      Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()),
    );
  }

  private mapear(fila: ObjetivoConEstrategias): Objetivo {
    return Objetivo.reconstruir({
      id: fila.id,
      pacienteId: fila.pacienteId,
      titulo: fila.titulo,
      descripcion: fila.descripcion,
      prioridad: fila.prioridad,
      estado: fila.estado,
      fechaObjetivo: fila.fechaObjetivo,
      estrategias: fila.estrategias.map((estrategia) => ({
        id: estrategia.id,
        descripcion: estrategia.descripcion,
        motivo: estrategia.motivo,
        estado: estrategia.estado as EstadoEstrategia,
        creadoEn: estrategia.creadoEn,
      })),
      creadoEn: fila.creadoEn,
      actualizadoEn: fila.actualizadoEn,
    });
  }
}
