import type { PrismaClient, EmailEnviado as EmailFila } from "@prisma/client";
import type { IEmailEnviadoRepositorio } from "@/dominio/repositorios/IEmailEnviadoRepositorio";
import { EmailEnviado } from "@/dominio/entidades/EmailEnviado";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/** Implementación con Prisma del log de emails enviados. */
export class PrismaRepositorioEmailEnviado implements IEmailEnviadoRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async registrar(email: EmailEnviado): Promise<void> {
    const d = email.aPrimitivos();
    await this.prisma.emailEnviado.create({
      data: {
        id: d.id,
        nutricionistaId: inquilinoActual(),
        plantillaClave: d.plantillaClave,
        para: d.para,
        asunto: d.asunto,
        referenciaId: d.referenciaId,
        pacienteId: d.pacienteId,
        error: d.error,
        creadoEn: d.creadoEn,
      },
    });
  }

  async yaEnviado(
    plantillaClave: string,
    referenciaId: string,
  ): Promise<boolean> {
    // La unicidad pasó a ser (nutricionistaId, plantillaClave, referenciaId):
    // antes dos consultorios con el mismo referenciaId se pisaban la
    // idempotencia y al segundo no le llegaba el recordatorio.
    const fila = await this.prisma.emailEnviado.findFirst({
      where: { plantillaClave, referenciaId },
    });
    return fila != null;
  }

  async ultimoEnviadoParaTurno(
    plantillaClave: string,
    turnoId: string,
  ): Promise<Date | null> {
    // `startsWith` cubre las tres formas de referencia del mismo turno:
    // "<id>" (escalón de 1 día), "<id>:3" y "<id>:manual:<epoch>".
    const fila = await this.prisma.emailEnviado.findFirst({
      where: {
        plantillaClave,
        referenciaId: { startsWith: turnoId },
        // Un envío que falló no cuenta como aviso dado.
        error: null,
      },
      orderBy: { creadoEn: "desc" },
      select: { creadoEn: true },
    });
    return fila?.creadoEn ?? null;
  }

  async listarRecientes(limite = 30): Promise<EmailEnviado[]> {
    const filas = await this.prisma.emailEnviado.findMany({
      orderBy: { creadoEn: "desc" },
      take: limite,
    });
    return filas.map((fila) => this.mapear(fila));
  }

  private mapear(fila: EmailFila): EmailEnviado {
    return EmailEnviado.reconstruir({
      id: fila.id,
      plantillaClave: fila.plantillaClave,
      para: fila.para,
      asunto: fila.asunto,
      referenciaId: fila.referenciaId,
      pacienteId: fila.pacienteId,
      error: fila.error,
      creadoEn: fila.creadoEn,
    });
  }
}
