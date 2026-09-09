import type {
  PrismaClient,
  Suplemento as SuplementoFila,
} from "@prisma/client";
import type { ISuplementoRepositorio } from "@/dominio/repositorios/ISuplementoRepositorio";
import { Suplemento } from "@/dominio/entidades/Suplemento";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";
import { RepositorioPrismaBase } from "./base/RepositorioPrismaBase";
import { soloFecha } from "./base/fechas";

/** Implementación con Prisma del repositorio de Suplementos. */
export class PrismaRepositorioSuplemento
  extends RepositorioPrismaBase<SuplementoFila, Suplemento>
  implements ISuplementoRepositorio
{
  constructor(private readonly prisma: PrismaClient) {
    super(prisma.suplemento);
  }

  async crear(suplemento: Suplemento): Promise<Suplemento> {
    const d = suplemento.aPrimitivos();
    const fila = await this.prisma.suplemento.create({
      data: {
        nutricionistaId: inquilinoActual(),
        id: d.id,
        pacienteId: d.pacienteId,
        nombre: d.nombre,
        dosis: d.dosis,
        frecuencia: d.frecuencia,
        desde: d.desde ? soloFecha(d.desde) : null,
        hasta: d.hasta ? soloFecha(d.hasta) : null,
        activo: d.activo,
        notas: d.notas,
        creadoEn: d.creadoEn,
      },
    });
    return mapearSuplemento(fila);
  }

  async actualizar(suplemento: Suplemento): Promise<Suplemento> {
    const d = suplemento.aPrimitivos();
    const fila = await this.prisma.suplemento.update({
      where: { id: d.id },
      data: {
        nombre: d.nombre,
        dosis: d.dosis,
        frecuencia: d.frecuencia,
        desde: d.desde ? soloFecha(d.desde) : null,
        hasta: d.hasta ? soloFecha(d.hasta) : null,
        activo: d.activo,
        notas: d.notas,
      },
    });
    return mapearSuplemento(fila);
  }

  async listarPorPaciente(
    pacienteId: string,
    incluirInactivos = false,
  ): Promise<Suplemento[]> {
    const filas = await this.prisma.suplemento.findMany({
      where: { pacienteId, ...(incluirInactivos ? {} : { activo: true }) },
      orderBy: [{ activo: "desc" }, { creadoEn: "desc" }],
    });
    return this.mapearTodas(filas);
  }

  protected override mapear(fila: SuplementoFila): Suplemento {
    return mapearSuplemento(fila);
  }
}

export function mapearSuplemento(fila: SuplementoFila): Suplemento {
  return Suplemento.reconstruir({
    id: fila.id,
    pacienteId: fila.pacienteId,
    nombre: fila.nombre,
    dosis: fila.dosis,
    frecuencia: fila.frecuencia,
    desde: fila.desde,
    hasta: fila.hasta,
    activo: fila.activo,
    notas: fila.notas,
    creadoEn: fila.creadoEn,
  });
}
