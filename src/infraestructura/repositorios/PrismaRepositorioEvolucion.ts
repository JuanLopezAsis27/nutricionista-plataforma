import type {
  Prisma,
  PrismaClient,
  Evolucion as EvolucionFila,
} from "@prisma/client";
import type { IEvolucionRepositorio } from "@/dominio/repositorios/IEvolucionRepositorio";
import { Evolucion } from "@/dominio/entidades/Evolucion";
import type { CampoPersonalizadoEvolucion } from "@/dominio/entidades/Evolucion";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";
import { RepositorioPrismaBase } from "./base/RepositorioPrismaBase";

/** Implementación con Prisma del repositorio de Evoluciones de control. */
export class PrismaRepositorioEvolucion
  extends RepositorioPrismaBase<EvolucionFila, Evolucion>
  implements IEvolucionRepositorio
{
  constructor(private readonly prisma: PrismaClient) {
    super(prisma.evolucion);
  }

  async crear(evolucion: Evolucion): Promise<Evolucion> {
    const fila = await this.prisma.evolucion.create({
      data: {
        nutricionistaId: inquilinoActual(),
        ...escribibles(evolucion),
      },
    });
    return mapearEvolucion(fila);
  }

  async actualizar(evolucion: Evolucion): Promise<Evolucion> {
    const {
      id: _id,
      pacienteId: _pacienteId,
      ...cambios
    } = escribibles(evolucion);
    const fila = await this.prisma.evolucion.update({
      where: { id: evolucion.id },
      data: cambios,
    });
    return mapearEvolucion(fila);
  }

  /** Descendente: la ficha muestra primero la última consulta. */
  async listarPorPaciente(pacienteId: string): Promise<Evolucion[]> {
    const filas = await this.prisma.evolucion.findMany({
      where: { pacienteId },
      orderBy: { fecha: "desc" },
    });
    return this.mapearTodas(filas);
  }

  async existeEnFecha(
    pacienteId: string,
    fecha: Date,
    excluirId?: string,
  ): Promise<boolean> {
    const fila = await this.prisma.evolucion.findFirst({
      where: {
        pacienteId,
        fecha,
        ...(excluirId ? { id: { not: excluirId } } : {}),
      },
      select: { id: true },
    });
    return fila !== null;
  }

  protected override mapear(fila: EvolucionFila): Evolucion {
    return mapearEvolucion(fila);
  }
}

/**
 * Campos que se escriben en la base.
 *
 * Se enumeran a mano —y los usan tanto el `create` como el `update`— para que
 * un campo nuevo de la evolución no se pierda en silencio por escribirlo en un
 * solo lado, que es un error que este repo ya cometió con la modalidad de plan.
 */
function escribibles(evolucion: Evolucion) {
  const datos = evolucion.aPrimitivos();
  return {
    id: datos.id,
    pacienteId: datos.pacienteId,
    fecha: datos.fecha,
    cumplimientoDieta: datos.cumplimientoDieta,
    entrenamiento: datos.entrenamiento,
    deposiciones: datos.deposiciones,
    orina: datos.orina,
    descanso: datos.descanso,
    indispuesta: datos.indispuesta,
    sePercibe: datos.sePercibe,
    // La columna es JSONB: Prisma tipa el valor como `InputJsonValue`, que no
    // acepta una interfaz nominal (le falta la firma de índice). El array ya
    // viene normalizado por la entidad.
    camposPersonalizados:
      datos.camposPersonalizados as unknown as Prisma.InputJsonValue,
  };
}

export function mapearEvolucion(fila: EvolucionFila): Evolucion {
  return Evolucion.reconstruir({
    id: fila.id,
    pacienteId: fila.pacienteId,
    fecha: fila.fecha,
    cumplimientoDieta: fila.cumplimientoDieta,
    entrenamiento: fila.entrenamiento,
    deposiciones: fila.deposiciones,
    orina: fila.orina,
    descanso: fila.descanso,
    indispuesta: fila.indispuesta,
    sePercibe: fila.sePercibe,
    camposPersonalizados: leerCamposPersonalizados(fila.camposPersonalizados),
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
  });
}

/**
 * Lee la columna JSON de campos personalizados descartando lo que no tenga la
 * forma esperada.
 *
 * Es JSONB, así que el tipo no lo garantiza nadie: una fila escrita por una
 * versión anterior (o a mano) no puede tumbar la ficha entera del paciente.
 * Mismo criterio que el mapeador de la historia clínica.
 */
function leerCamposPersonalizados(
  valor: unknown,
): CampoPersonalizadoEvolucion[] {
  if (!Array.isArray(valor)) return [];
  const campos: CampoPersonalizadoEvolucion[] = [];
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
