import type {
  PrismaClient,
  Notificacion as NotificacionFila,
} from "@prisma/client";
import type { INotificacionRepositorio } from "@/dominio/repositorios/INotificacionRepositorio";
import {
  Notificacion,
  type TipoNotificacion,
} from "@/dominio/entidades/Notificacion";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/**
 * Implementación con Prisma del repositorio de notificaciones.
 *
 * Es tabla de inquilino: el `nutricionistaId` lo pone y lo filtra la extensión
 * (`PrismaClienteSingleton`), así que acá no aparece en ninguna consulta.
 */
export class PrismaRepositorioNotificacion implements INotificacionRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(notificacion: Notificacion): Promise<Notificacion> {
    const datos = notificacion.aPrimitivos();
    const fila = await this.prisma.notificacion.create({
      data: {
        // La extensión de inquilino igual lo inyecta, pero el tipo generado lo
        // exige y decirlo acá hace que la escritura sin alcance falle con un
        // mensaje que se entiende, en vez de con una violación de FK.
        nutricionistaId: inquilinoActual(),
        id: datos.id,
        tipo: datos.tipo,
        titulo: datos.titulo,
        detalle: datos.detalle,
        pacienteId: datos.pacienteId,
        enlace: datos.enlace,
        vistoEn: datos.vistoEn,
        creadoEn: datos.creadoEn,
      },
    });
    return mapearNotificacion(fila);
  }

  async obtenerPorId(id: string): Promise<Notificacion | null> {
    const fila = await this.prisma.notificacion.findFirst({ where: { id } });
    return fila ? mapearNotificacion(fila) : null;
  }

  async obtenerNoVistaDe(
    pacienteId: string,
    tipo: TipoNotificacion,
  ): Promise<Notificacion | null> {
    const fila = await this.prisma.notificacion.findFirst({
      where: { pacienteId, tipo, vistoEn: null },
      orderBy: { creadoEn: "desc" },
    });
    return fila ? mapearNotificacion(fila) : null;
  }

  async actualizar(notificacion: Notificacion): Promise<void> {
    const datos = notificacion.aPrimitivos();
    // `updateMany` por el mismo motivo que `marcarVista`: una fila de otro
    // consultorio tiene que ser un no-op, no un error que confirme que existe.
    await this.prisma.notificacion.updateMany({
      where: { id: datos.id },
      data: { detalle: datos.detalle, creadoEn: datos.creadoEn },
    });
  }

  async listarRecientes(limite: number): Promise<Notificacion[]> {
    const filas = await this.prisma.notificacion.findMany({
      orderBy: { creadoEn: "desc" },
      take: limite,
    });
    return filas.map(mapearNotificacion);
  }

  async contarNoVistas(): Promise<number> {
    return this.prisma.notificacion.count({ where: { vistoEn: null } });
  }

  async marcarVista(id: string, vistoEn: Date): Promise<void> {
    // `updateMany` y no `update`: con `update`, una notificación de otro
    // consultorio no daría 0 filas sino que LANZARÍA (P2025), y eso convierte
    // un id ajeno en una confirmación de que existe. Así, no encontrarla y no
    // poder verla se ven igual desde afuera.
    await this.prisma.notificacion.updateMany({
      where: { id, vistoEn: null },
      data: { vistoEn },
    });
  }

  async marcarTodasVistas(vistoEn: Date): Promise<number> {
    const { count } = await this.prisma.notificacion.updateMany({
      where: { vistoEn: null },
      data: { vistoEn },
    });
    return count;
  }

  async marcarVistasDePaciente(
    pacienteId: string,
    tipos: readonly TipoNotificacion[],
    vistoEn: Date,
  ): Promise<number> {
    const { count } = await this.prisma.notificacion.updateMany({
      where: { pacienteId, tipo: { in: [...tipos] }, vistoEn: null },
      data: { vistoEn },
    });
    return count;
  }
}

export function mapearNotificacion(fila: NotificacionFila): Notificacion {
  return Notificacion.reconstruir({
    id: fila.id,
    tipo: fila.tipo,
    titulo: fila.titulo,
    detalle: fila.detalle,
    pacienteId: fila.pacienteId,
    enlace: fila.enlace,
    vistoEn: fila.vistoEn,
    creadoEn: fila.creadoEn,
  });
}
