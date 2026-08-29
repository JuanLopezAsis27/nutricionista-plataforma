import type { PrismaClient, Prisma, PerfilDeportivo as PerfilFila } from "@prisma/client";
import type { IPerfilDeportivoRepositorio } from "@/dominio/repositorios/IPerfilDeportivoRepositorio";
import { PerfilDeportivo } from "@/dominio/entidades/PerfilDeportivo";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/**
 * Implementación con Prisma del repositorio del perfil deportivo.
 * El aislamiento por inquilino lo aplica la extensión de Prisma (upsert incluye
 * el nutricionistaId en where/create). Convierte Decimal↔number.
 */
export class PrismaRepositorioPerfilDeportivo implements IPerfilDeportivoRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async obtenerPorPaciente(pacienteId: string): Promise<PerfilDeportivo | null> {
    const fila = await this.prisma.perfilDeportivo.findUnique({ where: { pacienteId } });
    return fila ? this.mapear(fila) : null;
  }

  async guardar(perfil: PerfilDeportivo): Promise<PerfilDeportivo> {
    const d = perfil.aPrimitivos();
    const datos = {
      deporte: d.deporte,
      disciplina: d.disciplina,
      nivel: d.nivel,
      fase: d.fase,
      diasEntrenamientoSemana: d.diasEntrenamientoSemana,
      horasSemana: d.horasSemana,
      pesoCategoriaKg: d.pesoCategoriaKg,
      posicion: d.posicion,
      objetivo: d.objetivo,
      notas: d.notas,
    };
    const fila = await this.prisma.perfilDeportivo.upsert({
      where: { pacienteId: d.pacienteId },
      create: {
        id: d.id,
        nutricionistaId: inquilinoActual(),
        pacienteId: d.pacienteId,
        creadoEn: d.creadoEn,
        ...datos,
      },
      update: datos,
    });
    return this.mapear(fila);
  }

  async eliminarPorPaciente(pacienteId: string): Promise<void> {
    await this.prisma.perfilDeportivo.deleteMany({ where: { pacienteId } });
  }

  private mapear(fila: PerfilFila): PerfilDeportivo {
    return PerfilDeportivo.reconstruir({
      id: fila.id,
      pacienteId: fila.pacienteId,
      deporte: fila.deporte,
      disciplina: fila.disciplina,
      nivel: fila.nivel,
      fase: fila.fase,
      diasEntrenamientoSemana: fila.diasEntrenamientoSemana,
      horasSemana: aNumero(fila.horasSemana),
      pesoCategoriaKg: aNumero(fila.pesoCategoriaKg),
      posicion: fila.posicion,
      objetivo: fila.objetivo,
      notas: fila.notas,
      creadoEn: fila.creadoEn,
      actualizadoEn: fila.actualizadoEn,
    });
  }
}

/** Decimal (o null) → number (o null). El Decimal nunca cruza a capas altas. */
function aNumero(valor: Prisma.Decimal | null): number | null {
  return valor === null ? null : Number(valor);
}
