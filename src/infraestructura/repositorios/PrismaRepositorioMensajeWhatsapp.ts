import type { PrismaClient, MensajeWhatsapp as MensajeFila } from "@prisma/client";
import type { IMensajeWhatsappRepositorio } from "@/dominio/repositorios/IMensajeWhatsappRepositorio";
import { MensajeWhatsapp } from "@/dominio/entidades/MensajeWhatsapp";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/**
 * Implementación con Prisma del hilo de WhatsApp.
 *
 * No filtra por `nutricionistaId`: lo inyecta la extensión multi-inquilino,
 * también en el webhook (que corre dentro de `ejecutarEnNutricionista`).
 */
export class PrismaRepositorioMensajeWhatsapp implements IMensajeWhatsappRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(mensaje: MensajeWhatsapp): Promise<MensajeWhatsapp> {
    const d = mensaje.aPrimitivos();
    const fila = await this.prisma.mensajeWhatsapp.create({
      data: {
        nutricionistaId: inquilinoActual(),
        id: d.id,
        pacienteId: d.pacienteId,
        direccion: d.direccion,
        telefono: d.telefono,
        cuerpo: d.cuerpo,
        idExterno: d.idExterno,
        estado: d.estado,
        error: d.error,
        creadoEn: d.creadoEn,
      },
    });
    return this.mapear(fila);
  }

  async actualizar(mensaje: MensajeWhatsapp): Promise<MensajeWhatsapp> {
    const d = mensaje.aPrimitivos();
    const fila = await this.prisma.mensajeWhatsapp.update({
      where: { id: d.id },
      data: { estado: d.estado, error: d.error },
    });
    return this.mapear(fila);
  }

  async obtenerPorIdExterno(idExterno: string): Promise<MensajeWhatsapp | null> {
    const fila = await this.prisma.mensajeWhatsapp.findFirst({ where: { idExterno } });
    return fila ? this.mapear(fila) : null;
  }

  async listarPorPaciente(pacienteId: string, limite = 200): Promise<MensajeWhatsapp[]> {
    const filas = await this.prisma.mensajeWhatsapp.findMany({
      where: { pacienteId },
      orderBy: { creadoEn: "desc" },
      take: limite,
    });
    // Se piden los últimos N y se devuelven en orden cronológico para el hilo.
    return filas.reverse().map((fila) => this.mapear(fila));
  }

  async ultimoEntrante(pacienteId: string): Promise<MensajeWhatsapp | null> {
    const fila = await this.prisma.mensajeWhatsapp.findFirst({
      where: { pacienteId, direccion: "ENTRANTE" },
      orderBy: { creadoEn: "desc" },
    });
    return fila ? this.mapear(fila) : null;
  }

  private mapear(fila: MensajeFila): MensajeWhatsapp {
    return MensajeWhatsapp.reconstruir({
      id: fila.id,
      pacienteId: fila.pacienteId,
      direccion: fila.direccion,
      telefono: fila.telefono,
      cuerpo: fila.cuerpo,
      idExterno: fila.idExterno,
      estado: fila.estado,
      error: fila.error,
      creadoEn: fila.creadoEn,
      actualizadoEn: fila.actualizadoEn,
    });
  }
}
