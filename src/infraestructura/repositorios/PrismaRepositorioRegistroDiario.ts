import type { PrismaClient, Prisma } from "@prisma/client";
import type {
  IRegistroDiarioRepositorio,
  HijoDiario,
  ResumenDiario,
} from "@/dominio/repositorios/IRegistroDiarioRepositorio";
import {
  RegistroDiario,
  type ComidaConsumida,
  type ActividadFisica,
} from "@/dominio/entidades/RegistroDiario";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/** Fila del registro con hijos incluidos (foto solo como id). */
type RegistroConHijos = Prisma.RegistroDiarioGetPayload<{
  include: {
    comidas: { include: { foto: { select: { id: true } } } };
    actividades: true;
  };
}>;

const INCLUIR_HIJOS = {
  comidas: {
    include: { foto: { select: { id: true } } },
    orderBy: { creadoEn: "asc" },
  },
  actividades: { orderBy: { creadoEn: "asc" } },
} satisfies Prisma.RegistroDiarioInclude;

/**
 * Implementación con Prisma del repositorio del Diario.
 * Los Decimal se convierten a number en el mapeo (nunca salen de acá).
 */
export class PrismaRepositorioRegistroDiario implements IRegistroDiarioRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(registro: RegistroDiario): Promise<RegistroDiario> {
    const datos = registro.aPrimitivos();
    const fila = await this.prisma.registroDiario.create({
      data: {
        nutricionistaId: inquilinoActual(),
        id: datos.id,
        pacienteId: datos.pacienteId,
        fecha: this.soloFecha(datos.fecha),
        pesoKg: datos.pesoKg,
        aguaMl: datos.aguaMl,
        horasSueno: datos.horasSueno,
        calidadSueno: datos.calidadSueno,
        notas: datos.notas,
        creadoEn: datos.creadoEn,
      },
      include: INCLUIR_HIJOS,
    });
    return this.mapear(fila);
  }

  async actualizarEscalares(registro: RegistroDiario): Promise<RegistroDiario> {
    const datos = registro.aPrimitivos();
    const fila = await this.prisma.registroDiario.update({
      where: { id: datos.id },
      data: {
        pesoKg: datos.pesoKg,
        aguaMl: datos.aguaMl,
        horasSueno: datos.horasSueno,
        calidadSueno: datos.calidadSueno,
        notas: datos.notas,
      },
      include: INCLUIR_HIJOS,
    });
    return this.mapear(fila);
  }

  async obtenerPorPacienteYFecha(
    pacienteId: string,
    fecha: Date,
  ): Promise<RegistroDiario | null> {
    const fila = await this.prisma.registroDiario.findUnique({
      where: {
        pacienteId_fecha: { pacienteId, fecha: this.soloFecha(fecha) },
      },
      include: INCLUIR_HIJOS,
    });
    return fila ? this.mapear(fila) : null;
  }

  async listarPorRango(
    pacienteId: string,
    desde: Date,
    hasta: Date,
  ): Promise<RegistroDiario[]> {
    const filas = await this.prisma.registroDiario.findMany({
      where: {
        pacienteId,
        fecha: { gte: this.soloFecha(desde), lte: this.soloFecha(hasta) },
      },
      include: INCLUIR_HIJOS,
      orderBy: { fecha: "asc" },
    });
    return filas.map((fila) => this.mapear(fila));
  }

  async contarRegistros(pacienteId: string): Promise<number> {
    return this.prisma.registroDiario.count({ where: { pacienteId } });
  }

  /**
   * Tres consultas agregadas para TODOS los pacientes, en vez de dos por
   * paciente. El filtro por inquilino lo agrega la extensión de Prisma.
   */
  async resumenPorPacienteEnRango(
    desde: Date,
    hasta: Date,
  ): Promise<Map<string, ResumenDiario>> {
    const rango = { gte: this.soloFecha(desde), lte: this.soloFecha(hasta) };

    const [totales, conPeso, conActividad] = await Promise.all([
      // Cuántos registros tiene cada paciente en toda su historia.
      this.prisma.registroDiario.groupBy({ by: ["pacienteId"], _count: { _all: true } }),
      // Quiénes registraron peso dentro del rango.
      this.prisma.registroDiario.findMany({
        where: { fecha: rango, pesoKg: { not: null } },
        select: { pacienteId: true },
        distinct: ["pacienteId"],
      }),
      // Quiénes cargaron alguna actividad dentro del rango.
      this.prisma.registroDiario.findMany({
        where: { fecha: rango, actividades: { some: {} } },
        select: { pacienteId: true },
        distinct: ["pacienteId"],
      }),
    ]);

    const pesoDe = new Set(conPeso.map((r) => r.pacienteId));
    const actividadDe = new Set(conActividad.map((r) => r.pacienteId));

    const resumen = new Map<string, ResumenDiario>();
    for (const fila of totales) {
      resumen.set(fila.pacienteId, {
        totalRegistros: fila._count._all,
        registroPeso: pesoDe.has(fila.pacienteId),
        huboActividad: actividadDe.has(fila.pacienteId),
      });
    }
    return resumen;
  }

  async agregarComida(registroId: string, comida: ComidaConsumida): Promise<void> {
    await this.prisma.comidaConsumida.create({
      data: {
        nutricionistaId: inquilinoActual(),
        id: comida.id,
        registroId,
        franja: comida.franja,
        hora: comida.hora,
        descripcion: comida.descripcion,
        porcion: comida.porcion,
        creadoEn: comida.creadoEn,
      },
    });
  }

  async eliminarComida(comidaId: string): Promise<void> {
    await this.prisma.comidaConsumida.delete({ where: { id: comidaId } });
  }

  async obtenerComida(comidaId: string): Promise<HijoDiario | null> {
    const fila = await this.prisma.comidaConsumida.findUnique({
      where: { id: comidaId },
      select: { id: true, registroId: true, registro: { select: { pacienteId: true } } },
    });
    return fila
      ? { id: fila.id, registroId: fila.registroId, pacienteId: fila.registro.pacienteId }
      : null;
  }

  async agregarActividad(registroId: string, actividad: ActividadFisica): Promise<void> {
    await this.prisma.actividadFisica.create({
      data: {
        nutricionistaId: inquilinoActual(),
        id: actividad.id,
        registroId,
        tipo: actividad.tipo,
        duracionMinutos: actividad.duracionMinutos,
        intensidad: actividad.intensidad,
        notas: actividad.notas,
        creadoEn: actividad.creadoEn,
      },
    });
  }

  async eliminarActividad(actividadId: string): Promise<void> {
    await this.prisma.actividadFisica.delete({ where: { id: actividadId } });
  }

  async obtenerActividad(actividadId: string): Promise<HijoDiario | null> {
    const fila = await this.prisma.actividadFisica.findUnique({
      where: { id: actividadId },
      select: { id: true, registroId: true, registro: { select: { pacienteId: true } } },
    });
    return fila
      ? { id: fila.id, registroId: fila.registroId, pacienteId: fila.registro.pacienteId }
      : null;
  }

  private soloFecha(fecha: Date): Date {
    return new Date(
      Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()),
    );
  }

  private mapear(fila: RegistroConHijos): RegistroDiario {
    return RegistroDiario.reconstruir({
      id: fila.id,
      pacienteId: fila.pacienteId,
      fecha: fila.fecha,
      pesoKg: fila.pesoKg === null ? null : fila.pesoKg.toNumber(),
      aguaMl: fila.aguaMl,
      horasSueno: fila.horasSueno === null ? null : fila.horasSueno.toNumber(),
      calidadSueno: fila.calidadSueno,
      notas: fila.notas,
      comidas: fila.comidas.map((comida) => ({
        id: comida.id,
        franja: comida.franja,
        hora: comida.hora,
        descripcion: comida.descripcion,
        porcion: comida.porcion,
        fotoArchivoId: comida.foto?.id ?? null,
        creadoEn: comida.creadoEn,
      })),
      actividades: fila.actividades.map((actividad) => ({
        id: actividad.id,
        tipo: actividad.tipo,
        duracionMinutos: actividad.duracionMinutos,
        intensidad: actividad.intensidad,
        notas: actividad.notas,
        creadoEn: actividad.creadoEn,
      })),
      creadoEn: fila.creadoEn,
      actualizadoEn: fila.actualizadoEn,
    });
  }
}
