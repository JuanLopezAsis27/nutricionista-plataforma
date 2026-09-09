import type { PrismaClient } from "@prisma/client";
import type {
  IEstadisticasRepositorio,
  ParametrosEstadisticas,
  DatosCrudosEstadisticas,
  PuntoSerieMensual,
  EstadisticaEstablecimiento,
  TipoDetalleEstadistica,
  PacienteEstadistica,
} from "@/dominio/repositorios/IEstadisticasRepositorio";

/**
 * Read model de estadísticas con Prisma. Todo son consultas de lectura
 * (count/groupBy/aggregate); ninguna entidad nueva. Decimal → number nunca
 * sale de infraestructura.
 */
export class PrismaRepositorioEstadisticas implements IEstadisticasRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async obtener(
    params: ParametrosEstadisticas,
  ): Promise<DatosCrudosEstadisticas> {
    const { desde, hasta, sinActividadDesde, meses } = params;
    const rangoFecha = { gte: desde, lte: hasta };

    const [
      pacientesActivos,
      pacientesNuevos,
      pacientesEnRiesgo,
      turnosPorEstado,
      ingresoCobrado,
      ingresoPendiente,
      serieMensual,
      porEstablecimiento,
    ] = await Promise.all([
      this.prisma.paciente.count({ where: { archivadoEn: null } }),
      this.prisma.paciente.count({ where: { creadoEn: rangoFecha } }),
      this.contarEnRiesgo(sinActividadDesde),
      this.turnosPorEstado(desde, hasta),
      this.sumarIngresos({ pagado: true, fecha: rangoFecha }),
      this.sumarIngresos({
        pagado: false,
        estado: { not: "CANCELADO" },
        precio: { not: null },
        fecha: rangoFecha,
      }),
      this.serieMensual(hasta, meses),
      this.porEstablecimiento(desde, hasta),
    ]);

    return {
      pacientesActivos,
      pacientesNuevos,
      pacientesEnRiesgo,
      turnosPorEstado,
      ingresoCobrado,
      ingresoPendiente,
      serieMensual,
      porEstablecimiento,
    };
  }

  /**
   * Corte por sede del período: cuántos turnos, cuántos se completaron y
   * cuánta plata entró y falta entrar en cada una.
   *
   * Dos `groupBy` y una lectura de nombres, no una consulta por sede: el corte
   * tiene que costar lo mismo con dos consultorios que con diez. Los nombres
   * se piden aparte —incluidas las archivadas— porque un turno del período
   * puede ser de una sede que ya cerró y la fila igual tiene que decir cuál.
   */
  private async porEstablecimiento(
    desde: Date,
    hasta: Date,
  ): Promise<EstadisticaEstablecimiento[]> {
    const rangoFecha = { gte: desde, lte: hasta };

    const [porEstado, porCobro, sedes] = await Promise.all([
      this.prisma.turno.groupBy({
        by: ["establecimientoId", "estado"],
        where: { fecha: rangoFecha },
        _count: { _all: true },
      }),
      this.prisma.turno.groupBy({
        by: ["establecimientoId", "pagado"],
        // Un turno cancelado no es plata pendiente: nadie la va a cobrar.
        where: {
          fecha: rangoFecha,
          precio: { not: null },
          estado: { not: "CANCELADO" },
        },
        _sum: { precio: true },
      }),
      this.prisma.establecimiento.findMany({
        select: { id: true, nombre: true },
      }),
    ]);

    const nombres = new Map(sedes.map((s) => [s.id, s.nombre]));
    const filas = new Map<string, EstadisticaEstablecimiento>();
    const fila = (id: string): EstadisticaEstablecimiento => {
      const actual = filas.get(id) ?? {
        establecimientoId: id,
        nombre: nombres.get(id) ?? "Establecimiento eliminado",
        turnos: 0,
        completados: 0,
        ingresoCobrado: 0,
        ingresoPendiente: 0,
      };
      filas.set(id, actual);
      return actual;
    };

    for (const g of porEstado) {
      const f = fila(g.establecimientoId);
      f.turnos += g._count._all;
      if (g.estado === "COMPLETADO") f.completados += g._count._all;
    }
    for (const g of porCobro) {
      const f = fila(g.establecimientoId);
      const monto = g._sum.precio == null ? 0 : Number(g._sum.precio);
      if (g.pagado) f.ingresoCobrado += monto;
      else f.ingresoPendiente += monto;
    }

    return [...filas.values()].sort(
      (a, b) => b.ingresoCobrado - a.ingresoCobrado,
    );
  }

  async listarPacientes(
    tipo: TipoDetalleEstadistica,
    params: ParametrosEstadisticas,
  ): Promise<PacienteEstadistica[]> {
    if (tipo === "NUEVOS") {
      const filas = await this.prisma.paciente.findMany({
        where: { creadoEn: { gte: params.desde, lte: params.hasta } },
        select: { id: true, nombre: true, apellido: true, creadoEn: true },
        orderBy: { creadoEn: "desc" },
      });
      return filas.map((f) => ({ ...f, referencia: f.creadoEn }));
    }

    if (tipo === "ACTIVOS") {
      const filas = await this.prisma.paciente.findMany({
        where: { archivadoEn: null },
        select: { id: true, nombre: true, apellido: true, creadoEn: true },
        orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
      });
      return filas.map((f) => ({ ...f, referencia: f.creadoEn }));
    }

    // EN_RIESGO: vigentes sin turno ni registro desde el umbral.
    const [activos, conActividad, ultimaActividad] = await Promise.all([
      this.prisma.paciente.findMany({
        where: { archivadoEn: null },
        select: { id: true, nombre: true, apellido: true },
        orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
      }),
      this.idsConActividad(params.sinActividadDesde),
      this.ultimaActividadPorPaciente(),
    ]);

    return activos
      .filter((p) => !conActividad.has(p.id))
      .map((p) => ({
        id: p.id,
        nombre: p.nombre,
        apellido: p.apellido,
        referencia: ultimaActividad.get(p.id) ?? null,
      }));
  }

  /** Ids de pacientes con turno o registro desde la fecha umbral. */
  private async idsConActividad(desde: Date): Promise<Set<string>> {
    const [conTurno, conRegistro] = await Promise.all([
      this.prisma.turno.findMany({
        where: { fecha: { gte: desde } },
        select: { pacienteId: true },
        distinct: ["pacienteId"],
      }),
      this.prisma.registroDiario.findMany({
        where: { fecha: { gte: desde } },
        select: { pacienteId: true },
        distinct: ["pacienteId"],
      }),
    ]);
    return new Set<string>([
      ...conTurno.map((t) => t.pacienteId),
      ...conRegistro.map((r) => r.pacienteId),
    ]);
  }

  /** Última fecha de actividad (turno o registro) por paciente. */
  private async ultimaActividadPorPaciente(): Promise<Map<string, Date>> {
    const [turnos, registros] = await Promise.all([
      this.prisma.turno.groupBy({ by: ["pacienteId"], _max: { fecha: true } }),
      this.prisma.registroDiario.groupBy({
        by: ["pacienteId"],
        _max: { fecha: true },
      }),
    ]);
    const ultima = new Map<string, Date>();
    const registrar = (pacienteId: string, fecha: Date | null): void => {
      if (!fecha) return;
      const previa = ultima.get(pacienteId);
      if (!previa || fecha > previa) ultima.set(pacienteId, fecha);
    };
    for (const t of turnos) registrar(t.pacienteId, t._max.fecha);
    for (const r of registros) registrar(r.pacienteId, r._max.fecha);
    return ultima;
  }

  /** Pacientes vigentes sin turno NI registro diario desde la fecha umbral. */
  private async contarEnRiesgo(sinActividadDesde: Date): Promise<number> {
    const [activos, conActividad] = await Promise.all([
      this.prisma.paciente.findMany({
        where: { archivadoEn: null },
        select: { id: true },
      }),
      this.idsConActividad(sinActividadDesde),
    ]);
    return activos.filter((p) => !conActividad.has(p.id)).length;
  }

  private async turnosPorEstado(
    desde: Date,
    hasta: Date,
  ): Promise<DatosCrudosEstadisticas["turnosPorEstado"]> {
    const grupos = await this.prisma.turno.groupBy({
      by: ["estado"],
      where: { fecha: { gte: desde, lte: hasta } },
      _count: { _all: true },
    });

    const conteo = { PENDIENTE: 0, CONFIRMADO: 0, CANCELADO: 0, COMPLETADO: 0 };
    for (const g of grupos) {
      conteo[g.estado] = g._count._all;
    }
    return conteo;
  }

  private async sumarIngresos(
    where: Parameters<PrismaClient["turno"]["aggregate"]>[0]["where"],
  ): Promise<number> {
    const r = await this.prisma.turno.aggregate({
      _sum: { precio: true },
      where,
    });
    return r._sum.precio == null ? 0 : Number(r._sum.precio);
  }

  private async serieMensual(
    hasta: Date,
    meses: number,
  ): Promise<PuntoSerieMensual[]> {
    const inicio = new Date(
      Date.UTC(hasta.getUTCFullYear(), hasta.getUTCMonth() - (meses - 1), 1),
    );
    const turnos = await this.prisma.turno.findMany({
      where: { fecha: { gte: inicio, lte: hasta } },
      select: { fecha: true, estado: true },
    });

    // Inicializa cada mes del rango en cero para no dejar huecos en el gráfico.
    const mapa = new Map<string, PuntoSerieMensual>();
    for (let i = 0; i < meses; i += 1) {
      const d = new Date(
        Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + i, 1),
      );
      const clave = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      mapa.set(clave, { mes: clave, total: 0, completados: 0 });
    }

    for (const turno of turnos) {
      const clave = `${turno.fecha.getUTCFullYear()}-${String(
        turno.fecha.getUTCMonth() + 1,
      ).padStart(2, "0")}`;
      const punto = mapa.get(clave);
      if (!punto) continue;
      punto.total += 1;
      if (turno.estado === "COMPLETADO") punto.completados += 1;
    }

    return [...mapa.values()];
  }
}
