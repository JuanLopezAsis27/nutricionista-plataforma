import type {
  Prisma,
  PrismaClient,
  MensajeWhatsapp as MensajeFila,
} from "@prisma/client";
import type {
  IMensajeWhatsappRepositorio,
  ResumenWhatsappPaciente,
} from "@/dominio/repositorios/IMensajeWhatsappRepositorio";
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
        leidoEn: d.leidoEn,
        creadoEn: d.creadoEn,
      },
    });
    return mapearMensajeWhatsapp(fila);
  }

  async actualizar(mensaje: MensajeWhatsapp): Promise<MensajeWhatsapp> {
    const d = mensaje.aPrimitivos();
    const fila = await this.prisma.mensajeWhatsapp.update({
      where: { id: d.id },
      data: { estado: d.estado, error: d.error },
    });
    return mapearMensajeWhatsapp(fila);
  }

  async obtenerPorIdExterno(
    idExterno: string,
  ): Promise<MensajeWhatsapp | null> {
    const fila = await this.prisma.mensajeWhatsapp.findFirst({
      where: { idExterno },
    });
    return fila ? mapearMensajeWhatsapp(fila) : null;
  }

  async listarPorPaciente(
    pacienteId: string,
    limite = 200,
    telefono: string | null = null,
  ): Promise<MensajeWhatsapp[]> {
    const filas = await this.prisma.mensajeWhatsapp.findMany({
      where: deLaConversacion(pacienteId, telefono),
      orderBy: { creadoEn: "desc" },
      take: limite,
    });
    // Se piden los últimos N y se devuelven en orden cronológico para el hilo.
    return filas.reverse().map((fila) => mapearMensajeWhatsapp(fila));
  }

  async ultimoEntrante(
    pacienteId: string,
    telefono: string | null = null,
  ): Promise<MensajeWhatsapp | null> {
    const fila = await this.prisma.mensajeWhatsapp.findFirst({
      where: {
        ...deLaConversacion(pacienteId, telefono),
        direccion: "ENTRANTE",
      },
      orderBy: { creadoEn: "desc" },
    });
    return fila ? mapearMensajeWhatsapp(fila) : null;
  }

  async ultimoSalienteAlTelefono(
    telefono: string,
  ): Promise<MensajeWhatsapp | null> {
    const fila = await this.prisma.mensajeWhatsapp.findFirst({
      where: { telefono, direccion: "SALIENTE" },
      orderBy: { creadoEn: "desc" },
    });
    return fila ? mapearMensajeWhatsapp(fila) : null;
  }

  async ultimosPorPacientes(
    pacienteIds: string[],
  ): Promise<Map<string, MensajeWhatsapp>> {
    return this.ultimosPor(pacienteIds, undefined);
  }

  async ultimosEntrantesPorPacientes(
    pacienteIds: string[],
  ): Promise<Map<string, MensajeWhatsapp>> {
    return this.ultimosPor(pacienteIds, "ENTRANTE");
  }

  async contarNoLeidos(pacienteId?: string): Promise<number> {
    return this.prisma.mensajeWhatsapp.count({
      where: {
        direccion: "ENTRANTE",
        leidoEn: null,
        ...(pacienteId ? { pacienteId } : {}),
      },
    });
  }

  async marcarLeidos(
    pacienteId: string,
    leidoEn: Date,
    telefono: string | null = null,
  ): Promise<number> {
    const { count } = await this.prisma.mensajeWhatsapp.updateMany({
      where: {
        ...deLaConversacion(pacienteId, telefono),
        direccion: "ENTRANTE",
        leidoEn: null,
      },
      data: { leidoEn },
    });
    return count;
  }

  /**
   * Tres consultas en total, no una por paciente: quiénes tienen mensajes, el
   * último de cada uno (con `ultimosPor`, que ya resolvía eso para la bandeja
   * de seguimiento) y los sin leer agrupados.
   */
  async resumenPorPaciente(): Promise<ResumenWhatsappPaciente[]> {
    const [conMensajes, sinLeer] = await Promise.all([
      this.prisma.mensajeWhatsapp.groupBy({ by: ["pacienteId"] }),
      this.prisma.mensajeWhatsapp.groupBy({
        by: ["pacienteId"],
        where: { direccion: "ENTRANTE", leidoEn: null },
        _count: { _all: true },
      }),
    ]);
    const pacienteIds = conMensajes.map((g) => g.pacienteId);
    const ultimos = await this.ultimosPor(pacienteIds, undefined);
    const noLeidos = new Map(sinLeer.map((g) => [g.pacienteId, g._count._all]));
    const resumen: ResumenWhatsappPaciente[] = [];
    for (const pacienteId of pacienteIds) {
      const ultimo = ultimos.get(pacienteId);
      if (!ultimo) continue;
      resumen.push({
        pacienteId,
        ultimoMensajeTexto: ultimo.cuerpo,
        ultimoMensajeEn: ultimo.creadoEn,
        noLeidos: noLeidos.get(pacienteId) ?? 0,
      });
    }
    return resumen;
  }

  /**
   * Último mensaje de cada paciente en UNA consulta.
   *
   * Se ordena descendente y se queda con el primero de cada paciente, en vez
   * de hacer un `findFirst` por fila: la bandeja de seguimiento muestra
   * decenas de conversaciones y esa diferencia es la que decide si la pantalla
   * abre o se arrastra. El `take` acota lo que puede traer una conversación
   * muy activa.
   */
  private async ultimosPor(
    pacienteIds: string[],
    direccion: "ENTRANTE" | "SALIENTE" | undefined,
  ): Promise<Map<string, MensajeWhatsapp>> {
    if (pacienteIds.length === 0) return new Map();

    const filas = await this.prisma.mensajeWhatsapp.findMany({
      where: {
        pacienteId: { in: pacienteIds },
        ...(direccion ? { direccion } : {}),
      },
      orderBy: { creadoEn: "desc" },
      take: pacienteIds.length * 50,
    });

    const mapa = new Map<string, MensajeWhatsapp>();
    for (const fila of filas) {
      if (!mapa.has(fila.pacienteId)) {
        mapa.set(fila.pacienteId, mapearMensajeWhatsapp(fila));
      }
    }
    return mapa;
  }
}

export function mapearMensajeWhatsapp(fila: MensajeFila): MensajeWhatsapp {
  return MensajeWhatsapp.reconstruir({
    id: fila.id,
    pacienteId: fila.pacienteId,
    direccion: fila.direccion,
    telefono: fila.telefono,
    cuerpo: fila.cuerpo,
    idExterno: fila.idExterno,
    estado: fila.estado,
    error: fila.error,
    leidoEn: fila.leidoEn,
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
  });
}

/**
 * Los mensajes de una conversación: los de la ficha y, si se da el número, los
 * de ese número en cualquier otra ficha del consultorio (el filtro de
 * inquilino lo pone la extensión).
 */
function deLaConversacion(
  pacienteId: string,
  telefono: string | null,
): Prisma.MensajeWhatsappWhereInput {
  return telefono ? { OR: [{ pacienteId }, { telefono }] } : { pacienteId };
}
