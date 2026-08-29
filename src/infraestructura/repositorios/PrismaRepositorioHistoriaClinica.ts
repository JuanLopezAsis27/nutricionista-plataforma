import type {
  PrismaClient,
  HistoriaClinica as HistoriaFila,
} from "@prisma/client";
import type { IHistoriaClinicaRepositorio } from "@/dominio/repositorios/IHistoriaClinicaRepositorio";
import { HistoriaClinica } from "@/dominio/entidades/HistoriaClinica";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/** Implementación con Prisma del repositorio de Historia Clínica. */
export class PrismaRepositorioHistoriaClinica implements IHistoriaClinicaRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async guardar(historia: HistoriaClinica): Promise<HistoriaClinica> {
    const datos = historia.aPrimitivos();
    const { id, pacienteId, actualizadoEn: _ignorado, ...campos } = datos;
    const fila = await this.prisma.historiaClinica.upsert({
      where: { pacienteId },
      create: { id, nutricionistaId: inquilinoActual(), pacienteId, ...campos },
      update: campos,
    });
    return mapearHistoriaClinica(fila);
  }

  async obtenerPorPaciente(
    pacienteId: string,
  ): Promise<HistoriaClinica | null> {
    const fila = await this.prisma.historiaClinica.findUnique({
      where: { pacienteId },
    });
    return fila ? mapearHistoriaClinica(fila) : null;
  }
}

export function mapearHistoriaClinica(fila: HistoriaFila): HistoriaClinica {
  return HistoriaClinica.reconstruir({
    id: fila.id,
    pacienteId: fila.pacienteId,
    motivoConsulta: fila.motivoConsulta,
    diagnosticos: fila.diagnosticos,
    medicacion: fila.medicacion,
    antecedentesPersonales: fila.antecedentesPersonales,
    antecedentesFamiliares: fila.antecedentesFamiliares,
    habitos: fila.habitos,
    contexto: fila.contexto,
    actualizadoEn: fila.actualizadoEn,
  });
}
