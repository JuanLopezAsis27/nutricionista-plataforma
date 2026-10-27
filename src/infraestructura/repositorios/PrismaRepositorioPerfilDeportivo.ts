import type {
  PrismaClient,
  Prisma,
  PerfilDeportivo as PerfilFila,
} from "@prisma/client";
import type { IPerfilDeportivoRepositorio } from "@/dominio/repositorios/IPerfilDeportivoRepositorio";
import { PerfilDeportivo } from "@/dominio/entidades/PerfilDeportivo";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/**
 * El perfil trae su deporte: el nombre, que muestra la pantalla (migración
 * 97), y qué planificación le corresponde, que decide qué ofrece la ficha
 * (migración 98).
 */
const CON_DEPORTE = {
  deporte: { select: { id: true, nombre: true, formatoPlanificacion: true } },
} as const satisfies Prisma.PerfilDeportivoInclude;

type PerfilConDeporte = PerfilFila & {
  deporte: Prisma.DeporteGetPayload<{
    select: { id: true; nombre: true; formatoPlanificacion: true };
  }>;
};

/**
 * Implementación con Prisma del repositorio del perfil deportivo.
 * El aislamiento por inquilino lo aplica la extensión de Prisma (upsert incluye
 * el nutricionistaId en where/create). Convierte Decimal↔number.
 */
export class PrismaRepositorioPerfilDeportivo implements IPerfilDeportivoRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async obtenerPorPaciente(
    pacienteId: string,
  ): Promise<PerfilDeportivo | null> {
    const fila = await this.prisma.perfilDeportivo.findUnique({
      where: { pacienteId },
      include: CON_DEPORTE,
    });
    return fila ? mapearPerfilDeportivo(fila) : null;
  }

  async guardar(perfil: PerfilDeportivo): Promise<PerfilDeportivo> {
    const d = perfil.aPrimitivos();
    const datos = {
      deporteId: d.deporte.id,
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
      include: CON_DEPORTE,
    });
    return mapearPerfilDeportivo(fila);
  }

  async eliminarPorPaciente(pacienteId: string): Promise<void> {
    await this.prisma.perfilDeportivo.deleteMany({ where: { pacienteId } });
  }

  /**
   * Con alcance global (el SUPERADMIN) cuenta los perfiles de TODOS los
   * consultorios, que es lo que hace falta para saber si un deporte se usa.
   */
  async contarPorDeporte(deporteId: string): Promise<number> {
    return this.prisma.perfilDeportivo.count({ where: { deporteId } });
  }
}

/** Decimal (o null) → number (o null). El Decimal nunca cruza a capas altas. */
function aNumero(valor: Prisma.Decimal | null): number | null {
  return valor === null ? null : Number(valor);
}

export function mapearPerfilDeportivo(fila: PerfilConDeporte): PerfilDeportivo {
  return PerfilDeportivo.reconstruir({
    id: fila.id,
    pacienteId: fila.pacienteId,
    deporte: {
      id: fila.deporte.id,
      nombre: fila.deporte.nombre,
      formatoPlanificacion: fila.deporte.formatoPlanificacion,
    },
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
