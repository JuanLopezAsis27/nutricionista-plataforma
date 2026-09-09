import type {
  PrismaClient,
  AlertaAlimentaria as AlertaFila,
} from "@prisma/client";
import type { IAlertaAlimentariaRepositorio } from "@/dominio/repositorios/IAlertaAlimentariaRepositorio";
import { AlertaAlimentaria } from "@/dominio/entidades/AlertaAlimentaria";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";
import { RepositorioPrismaBase } from "./base/RepositorioPrismaBase";

/** Implementación con Prisma del repositorio de Alertas Alimentarias. */
export class PrismaRepositorioAlertaAlimentaria
  extends RepositorioPrismaBase<AlertaFila, AlertaAlimentaria>
  implements IAlertaAlimentariaRepositorio
{
  constructor(private readonly prisma: PrismaClient) {
    super(prisma.alertaAlimentaria);
  }

  async crear(alerta: AlertaAlimentaria): Promise<AlertaAlimentaria> {
    const fila = await this.prisma.alertaAlimentaria.create({
      data: { ...alerta.aPrimitivos(), nutricionistaId: inquilinoActual() },
    });
    return mapearAlertaAlimentaria(fila);
  }

  async actualizar(alerta: AlertaAlimentaria): Promise<AlertaAlimentaria> {
    const {
      id,
      pacienteId: _paciente,
      creadoEn: _creado,
      ...datos
    } = alerta.aPrimitivos();
    const fila = await this.prisma.alertaAlimentaria.update({
      where: { id },
      data: datos,
    });
    return mapearAlertaAlimentaria(fila);
  }

  async listarPorPaciente(pacienteId: string): Promise<AlertaAlimentaria[]> {
    const filas = await this.prisma.alertaAlimentaria.findMany({
      where: { pacienteId },
      orderBy: [{ severidad: "desc" }, { creadoEn: "asc" }],
    });
    return this.mapearTodas(filas);
  }

  protected override mapear(fila: AlertaFila): AlertaAlimentaria {
    return mapearAlertaAlimentaria(fila);
  }
}

export function mapearAlertaAlimentaria(fila: AlertaFila): AlertaAlimentaria {
  return AlertaAlimentaria.reconstruir({
    id: fila.id,
    pacienteId: fila.pacienteId,
    tipo: fila.tipo,
    descripcion: fila.descripcion,
    severidad: fila.severidad,
    notas: fila.notas,
    creadoEn: fila.creadoEn,
  });
}
