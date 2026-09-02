import type {
  Prisma,
  PrismaClient,
  HistoriaClinica as HistoriaFila,
} from "@prisma/client";
import type { IHistoriaClinicaRepositorio } from "@/dominio/repositorios/IHistoriaClinicaRepositorio";
import { HistoriaClinica } from "@/dominio/entidades/HistoriaClinica";
import type { CampoPersonalizadoHistoria } from "@/dominio/entidades/HistoriaClinica";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/** Implementación con Prisma del repositorio de Historia Clínica. */
export class PrismaRepositorioHistoriaClinica implements IHistoriaClinicaRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async guardar(historia: HistoriaClinica): Promise<HistoriaClinica> {
    const datos = historia.aPrimitivos();
    const {
      id,
      pacienteId,
      actualizadoEn: _ignorado,
      camposPersonalizados,
      ...campos
    } = datos;
    // La columna es JSONB: Prisma tipa el valor como `InputJsonValue`, que no
    // acepta una interfaz nominal (le falta la firma de índice). El array ya
    // viene normalizado por la entidad.
    const escribibles = {
      ...campos,
      camposPersonalizados:
        camposPersonalizados as unknown as Prisma.InputJsonValue,
    };
    const fila = await this.prisma.historiaClinica.upsert({
      where: { pacienteId },
      create: {
        id,
        nutricionistaId: inquilinoActual(),
        pacienteId,
        ...escribibles,
      },
      update: escribibles,
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
    camposPersonalizados: leerCamposPersonalizados(fila.camposPersonalizados),
    actualizadoEn: fila.actualizadoEn,
  });
}

/**
 * Lee la columna JSON de campos personalizados descartando lo que no tenga la
 * forma esperada.
 *
 * Es JSONB, así que el tipo no lo garantiza nadie: una fila escrita por una
 * versión anterior (o a mano) no puede tumbar la ficha entera del paciente. Lo
 * que no se entiende se ignora, igual que hace el mapeador de plantillas con
 * las medidas que el dominio ya no conoce.
 */
function leerCamposPersonalizados(
  valor: unknown,
): CampoPersonalizadoHistoria[] {
  if (!Array.isArray(valor)) return [];
  const campos: CampoPersonalizadoHistoria[] = [];
  for (const item of valor) {
    if (!item || typeof item !== "object") continue;
    const { clave, etiqueta, valor: texto } = item as Record<string, unknown>;
    if (
      typeof clave === "string" &&
      typeof etiqueta === "string" &&
      typeof texto === "string" &&
      clave &&
      etiqueta &&
      texto
    ) {
      campos.push({ clave, etiqueta, valor: texto });
    }
  }
  return campos;
}
