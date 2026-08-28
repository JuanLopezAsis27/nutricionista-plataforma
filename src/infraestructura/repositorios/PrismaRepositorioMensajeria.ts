import type {
  PrismaClient,
  Conversacion as ConversacionFila,
  Mensaje as MensajeFila,
} from "@prisma/client";
import type {
  IMensajeriaRepositorio,
  ResumenConversacion,
} from "@/dominio/repositorios/IMensajeriaRepositorio";
import { Conversacion } from "@/dominio/entidades/Conversacion";
import { Mensaje } from "@/dominio/entidades/Mensaje";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/** Implementación con Prisma de la mensajería (conversaciones + mensajes). */
export class PrismaRepositorioMensajeria implements IMensajeriaRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async obtenerConversacionPorId(id: string): Promise<Conversacion | null> {
    const fila = await this.prisma.conversacion.findUnique({ where: { id } });
    return fila ? this.mapearConversacion(fila) : null;
  }

  async obtenerConversacionPorPaciente(pacienteId: string): Promise<Conversacion | null> {
    const fila = await this.prisma.conversacion.findUnique({ where: { pacienteId } });
    return fila ? this.mapearConversacion(fila) : null;
  }

  async crearConversacion(conversacion: Conversacion): Promise<Conversacion> {
    const d = conversacion.aPrimitivos();
    const fila = await this.prisma.conversacion.create({
      data: {
        nutricionistaId: inquilinoActual(),
        id: d.id,
        pacienteId: d.pacienteId,
        ultimoMensajeTexto: d.ultimoMensajeTexto,
        ultimoMensajeEn: d.ultimoMensajeEn,
        creadoEn: d.creadoEn,
        actualizadoEn: d.actualizadoEn,
      },
    });
    return this.mapearConversacion(fila);
  }

  async actualizarConversacion(conversacion: Conversacion): Promise<Conversacion> {
    const d = conversacion.aPrimitivos();
    const fila = await this.prisma.conversacion.update({
      where: { id: d.id },
      data: {
        ultimoMensajeTexto: d.ultimoMensajeTexto,
        ultimoMensajeEn: d.ultimoMensajeEn,
      },
    });
    return this.mapearConversacion(fila);
  }

  async listarResumen(viewerId: string): Promise<ResumenConversacion[]> {
    const filas = await this.prisma.conversacion.findMany({
      where: { ultimoMensajeEn: { not: null } },
      orderBy: { ultimoMensajeEn: "desc" },
      include: {
        paciente: { select: { nombre: true, apellido: true } },
        _count: {
          select: {
            mensajes: { where: { leidoEn: null, autorId: { not: viewerId } } },
          },
        },
      },
    });

    return filas.map((fila) => ({
      id: fila.id,
      pacienteId: fila.pacienteId,
      pacienteNombre: `${fila.paciente.nombre} ${fila.paciente.apellido}`,
      ultimoMensajeTexto: fila.ultimoMensajeTexto,
      ultimoMensajeEn: fila.ultimoMensajeEn,
      noLeidos: fila._count.mensajes,
    }));
  }

  async crearMensaje(mensaje: Mensaje): Promise<Mensaje> {
    const d = mensaje.aPrimitivos();
    const fila = await this.prisma.mensaje.create({
      data: {
        nutricionistaId: inquilinoActual(),
        id: d.id,
        conversacionId: d.conversacionId,
        autorId: d.autorId,
        cuerpo: d.cuerpo,
        leidoEn: d.leidoEn,
        creadoEn: d.creadoEn,
      },
    });
    return this.mapearMensaje(fila);
  }

  async listarMensajes(conversacionId: string, limite = 200): Promise<Mensaje[]> {
    // Trae los más recientes y los devuelve en orden cronológico ascendente.
    const filas = await this.prisma.mensaje.findMany({
      where: { conversacionId },
      orderBy: { creadoEn: "desc" },
      take: limite,
    });
    return filas.reverse().map((fila) => this.mapearMensaje(fila));
  }

  async marcarLeidos(conversacionId: string, viewerId: string, ahora: Date): Promise<void> {
    await this.prisma.mensaje.updateMany({
      where: { conversacionId, autorId: { not: viewerId }, leidoEn: null },
      data: { leidoEn: ahora },
    });
  }

  async contarNoLeidos(viewerId: string, conversacionId?: string): Promise<number> {
    return this.prisma.mensaje.count({
      where: {
        leidoEn: null,
        autorId: { not: viewerId },
        ...(conversacionId ? { conversacionId } : {}),
      },
    });
  }

  private mapearConversacion(fila: ConversacionFila): Conversacion {
    return Conversacion.reconstruir({
      id: fila.id,
      pacienteId: fila.pacienteId,
      ultimoMensajeTexto: fila.ultimoMensajeTexto,
      ultimoMensajeEn: fila.ultimoMensajeEn,
      creadoEn: fila.creadoEn,
      actualizadoEn: fila.actualizadoEn,
    });
  }

  private mapearMensaje(fila: MensajeFila): Mensaje {
    return Mensaje.reconstruir({
      id: fila.id,
      conversacionId: fila.conversacionId,
      autorId: fila.autorId,
      cuerpo: fila.cuerpo,
      leidoEn: fila.leidoEn,
      creadoEn: fila.creadoEn,
    });
  }
}
