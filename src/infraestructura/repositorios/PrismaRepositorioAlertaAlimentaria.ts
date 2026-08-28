import type { PrismaClient, AlertaAlimentaria as AlertaFila } from "@prisma/client";
import type { IAlertaAlimentariaRepositorio } from "@/dominio/repositorios/IAlertaAlimentariaRepositorio";
import {
  AlertaAlimentaria,
  type TipoAlertaAlimentaria,
  type SeveridadAlerta,
} from "@/dominio/entidades/AlertaAlimentaria";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/** Implementación con Prisma del repositorio de Alertas Alimentarias. */
export class PrismaRepositorioAlertaAlimentaria implements IAlertaAlimentariaRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async crear(alerta: AlertaAlimentaria): Promise<AlertaAlimentaria> {
    const fila = await this.prisma.alertaAlimentaria.create({
      data: { ...alerta.aPrimitivos(), nutricionistaId: inquilinoActual() },
    });
    return this.mapear(fila);
  }

  async actualizar(alerta: AlertaAlimentaria): Promise<AlertaAlimentaria> {
    const { id, pacienteId: _paciente, creadoEn: _creado, ...datos } = alerta.aPrimitivos();
    const fila = await this.prisma.alertaAlimentaria.update({
      where: { id },
      data: datos,
    });
    return this.mapear(fila);
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.alertaAlimentaria.delete({ where: { id } });
  }

  async obtenerPorId(id: string): Promise<AlertaAlimentaria | null> {
    const fila = await this.prisma.alertaAlimentaria.findUnique({ where: { id } });
    return fila ? this.mapear(fila) : null;
  }

  async listarPorPaciente(pacienteId: string): Promise<AlertaAlimentaria[]> {
    const filas = await this.prisma.alertaAlimentaria.findMany({
      where: { pacienteId },
      orderBy: [{ severidad: "desc" }, { creadoEn: "asc" }],
    });
    return filas.map((fila) => this.mapear(fila));
  }

  private mapear(fila: AlertaFila): AlertaAlimentaria {
    return AlertaAlimentaria.reconstruir({
      id: fila.id,
      pacienteId: fila.pacienteId,
      tipo: fila.tipo as TipoAlertaAlimentaria,
      descripcion: fila.descripcion,
      severidad: fila.severidad as SeveridadAlerta,
      notas: fila.notas,
      creadoEn: fila.creadoEn,
    });
  }
}
