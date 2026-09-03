import type { PrismaClient } from "@prisma/client";
import type {
  IConversacionIARepositorio,
  ResumenConversacionIA,
} from "@/dominio/repositorios/IConversacionIARepositorio";
import {
  ConversacionIA,
  type MensajeIA,
} from "@/dominio/entidades/ConversacionIA";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/** Implementación con Prisma de los chats con el asistente analítico. */
export class PrismaRepositorioConversacionIA implements IConversacionIARepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(conversacion: ConversacionIA): Promise<void> {
    const datos = conversacion.aPrimitivos();
    await this.prisma.conversacionIA.create({
      data: {
        id: datos.id,
        nutricionistaId: inquilinoActual(),
        pacienteId: datos.pacienteId,
        titulo: datos.titulo,
      },
    });
  }

  async agregarMensaje(
    conversacionId: string,
    mensaje: MensajeIA,
  ): Promise<void> {
    const inquilino = inquilinoActual();
    await this.prisma.$transaction([
      this.prisma.mensajeIA.create({
        data: {
          id: mensaje.id,
          nutricionistaId: inquilino,
          conversacionId,
          rol: mensaje.rol,
          contenido: mensaje.contenido,
          creadoEn: mensaje.creadoEn,
        },
      }),
      // Adelanta `actualizadoEn` (@updatedAt) para que la conversación suba al
      // tope de la lista: es el orden en el que se la busca.
      this.prisma.conversacionIA.update({
        where: { id: conversacionId },
        data: { titulo: undefined },
      }),
    ]);
  }

  async obtenerPorId(id: string): Promise<ConversacionIA | null> {
    const fila = await this.prisma.conversacionIA.findUnique({
      where: { id },
      include: { mensajes: { orderBy: { creadoEn: "asc" } } },
    });
    if (!fila) return null;
    return ConversacionIA.reconstruir({
      id: fila.id,
      pacienteId: fila.pacienteId,
      titulo: fila.titulo,
      mensajes: fila.mensajes.map((m) => ({
        id: m.id,
        rol: m.rol,
        contenido: m.contenido,
        creadoEn: m.creadoEn,
      })),
      creadoEn: fila.creadoEn,
      actualizadoEn: fila.actualizadoEn,
    });
  }

  async listar(
    limite: number,
    pacienteId: string | null,
  ): Promise<ResumenConversacionIA[]> {
    const filas = await this.prisma.conversacionIA.findMany({
      // `pacienteId: null` filtra por IS NULL, que es exactamente «los chats
      // del profesional». Ese es el contrato del puerto: null no es «todos».
      where: { pacienteId },
      orderBy: { actualizadoEn: "desc" },
      take: limite,
      select: {
        id: true,
        titulo: true,
        actualizadoEn: true,
        _count: { select: { mensajes: true } },
      },
    });
    return filas.map((f) => ({
      id: f.id,
      titulo: f.titulo,
      cantidadMensajes: f._count.mensajes,
      actualizadoEn: f.actualizadoEn,
    }));
  }

  async eliminar(id: string): Promise<void> {
    // Los mensajes se van en cascada (FK ON DELETE CASCADE).
    await this.prisma.conversacionIA.delete({ where: { id } });
  }
}
