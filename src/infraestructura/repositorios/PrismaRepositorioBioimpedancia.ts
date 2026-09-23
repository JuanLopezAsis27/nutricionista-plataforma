import type {
  PrismaClient,
  Bioimpedancia as BioimpedanciaFila,
} from "@prisma/client";
import type { IBioimpedanciaRepositorio } from "@/dominio/repositorios/IBioimpedanciaRepositorio";
import { Bioimpedancia } from "@/dominio/entidades/Bioimpedancia";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";
import { RepositorioPrismaBase } from "./base/RepositorioPrismaBase";
import { soloFecha } from "./base/fechas";

/**
 * Implementación con Prisma del repositorio de Bioimpedancia.
 * Los Decimal de Prisma se convierten a number en el mapeo: nunca salen de
 * infraestructura (superjson no los serializa).
 */
export class PrismaRepositorioBioimpedancia
  extends RepositorioPrismaBase<BioimpedanciaFila, Bioimpedancia>
  implements IBioimpedanciaRepositorio
{
  constructor(private readonly prisma: PrismaClient) {
    super(prisma.bioimpedancia);
  }

  async crear(medicion: Bioimpedancia): Promise<Bioimpedancia> {
    const datos = medicion.aPrimitivos();
    const fila = await this.prisma.bioimpedancia.create({
      data: {
        ...datos,
        nutricionistaId: inquilinoActual(),
        fecha: soloFecha(datos.fecha),
      },
    });
    return mapearBioimpedancia(fila);
  }

  async actualizar(medicion: Bioimpedancia): Promise<Bioimpedancia> {
    const {
      id,
      pacienteId: _paciente,
      creadoEn: _creado,
      ...datos
    } = medicion.aPrimitivos();
    const fila = await this.prisma.bioimpedancia.update({
      where: { id },
      data: { ...datos, fecha: soloFecha(datos.fecha) },
    });
    return mapearBioimpedancia(fila);
  }

  async listarPorPaciente(pacienteId: string): Promise<Bioimpedancia[]> {
    const filas = await this.prisma.bioimpedancia.findMany({
      where: { pacienteId },
      orderBy: { fecha: "asc" },
    });
    return this.mapearTodas(filas);
  }

  async existeEnFecha(
    pacienteId: string,
    fecha: Date,
    excluirId?: string,
  ): Promise<boolean> {
    const cantidad = await this.prisma.bioimpedancia.count({
      where: {
        pacienteId,
        fecha: soloFecha(fecha),
        ...(excluirId ? { id: { not: excluirId } } : {}),
      },
    });
    return cantidad > 0;
  }

  protected override mapear(fila: BioimpedanciaFila): Bioimpedancia {
    return mapearBioimpedancia(fila);
  }
}

/** Decimal de Prisma (o null) → number (o null). */
function aNumero(valor: { toNumber(): number } | null): number | null {
  return valor == null ? null : valor.toNumber();
}

export function mapearBioimpedancia(fila: BioimpedanciaFila): Bioimpedancia {
  return Bioimpedancia.reconstruir({
    id: fila.id,
    pacienteId: fila.pacienteId,
    fecha: fila.fecha,
    pesoKg: fila.pesoKg.toNumber(),
    masaMuscularKg: aNumero(fila.masaMuscularKg),
    masaGrasaKg: aNumero(fila.masaGrasaKg),
    porcentajeMuscular: aNumero(fila.porcentajeMuscular),
    porcentajeGrasa: aNumero(fila.porcentajeGrasa),
    observaciones: fila.observaciones,
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
  });
}
