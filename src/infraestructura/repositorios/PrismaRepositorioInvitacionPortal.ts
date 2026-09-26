import type {
  InvitacionPortal as InvitacionFila,
  PrismaClient,
} from "@prisma/client";
import type {
  IInvitacionPortalRepositorio,
  InvitacionEncontrada,
} from "@/dominio/repositorios/IInvitacionPortalRepositorio";
import { InvitacionPortal } from "@/dominio/entidades/InvitacionPortal";
import { ejecutarGlobal } from "@/infraestructura/multitenancy/contextoTenant";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/**
 * Implementación con Prisma de las invitaciones al portal.
 *
 * Todo corre en el consultorio en curso (la extensión de inquilino filtra y
 * asigna `nutricionistaId`) salvo `obtenerPorCodigoHash`: quien canjea todavía
 * no está en el consultorio de la invitación. Ver el comentario de la interfaz.
 */
export class PrismaRepositorioInvitacionPortal implements IInvitacionPortalRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async reemplazarDePaciente(
    invitacion: InvitacionPortal,
  ): Promise<InvitacionPortal> {
    const datos = invitacion.aPrimitivos();
    // Juntas: si la creación falla, la invitación anterior sigue sirviendo.
    const [, fila] = await this.prisma.$transaction([
      this.prisma.invitacionPortal.deleteMany({
        where: { pacienteId: datos.pacienteId },
      }),
      this.prisma.invitacionPortal.create({
        data: {
          // La extensión igual lo inyecta; decirlo hace que una escritura sin
          // alcance falle con un mensaje claro (como en las notificaciones).
          nutricionistaId: inquilinoActual(),
          id: datos.id,
          pacienteId: datos.pacienteId,
          codigoHash: datos.codigoHash,
          expiraEn: datos.expiraEn,
          usadaEn: datos.usadaEn,
          creadoEn: datos.creadoEn,
        },
      }),
    ]);
    return mapear(fila);
  }

  async obtenerPorCodigoHash(
    codigoHash: string,
  ): Promise<InvitacionEncontrada | null> {
    const fila = await ejecutarGlobal(() =>
      this.prisma.invitacionPortal.findUnique({ where: { codigoHash } }),
    );
    return fila
      ? { invitacion: mapear(fila), nutricionistaId: fila.nutricionistaId }
      : null;
  }

  async vigenteDePaciente(
    pacienteId: string,
    ahora: Date,
  ): Promise<InvitacionPortal | null> {
    const fila = await this.prisma.invitacionPortal.findFirst({
      where: { pacienteId, usadaEn: null, expiraEn: { gt: ahora } },
      orderBy: { creadoEn: "desc" },
    });
    return fila ? mapear(fila) : null;
  }

  async marcarUsada(id: string, ahora: Date): Promise<void> {
    await this.prisma.invitacionPortal.update({
      where: { id },
      data: { usadaEn: ahora },
    });
  }
}

function mapear(fila: InvitacionFila): InvitacionPortal {
  return InvitacionPortal.reconstruir({
    id: fila.id,
    pacienteId: fila.pacienteId,
    codigoHash: fila.codigoHash,
    expiraEn: fila.expiraEn,
    usadaEn: fila.usadaEn,
    creadoEn: fila.creadoEn,
  });
}
