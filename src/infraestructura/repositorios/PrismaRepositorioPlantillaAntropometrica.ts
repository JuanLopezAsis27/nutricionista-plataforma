import type {
  PrismaClient,
  PlantillaAntropometrica as PlantillaFila,
} from "@prisma/client";
import type { IPlantillaAntropometricaRepositorio } from "@/dominio/repositorios/IPlantillaAntropometricaRepositorio";
import {
  PlantillaAntropometrica,
  CAMPOS_PLANTILLA,
  type CampoPlantilla,
} from "@/dominio/entidades/PlantillaAntropometrica";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/** Implementación con Prisma del repositorio de plantillas de medición. */
export class PrismaRepositorioPlantillaAntropometrica implements IPlantillaAntropometricaRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async guardar(
    plantilla: PlantillaAntropometrica,
  ): Promise<PlantillaAntropometrica> {
    const datos = plantilla.aPrimitivos();
    const fila = await this.prisma.plantillaAntropometrica.upsert({
      where: { id: datos.id },
      create: {
        id: datos.id,
        nutricionistaId: inquilinoActual(),
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        campos: datos.campos,
      },
      update: {
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        campos: datos.campos,
      },
    });
    return mapear(fila);
  }

  async eliminar(id: string): Promise<void> {
    await this.prisma.plantillaAntropometrica.delete({ where: { id } });
  }

  async obtenerPorId(id: string): Promise<PlantillaAntropometrica | null> {
    const fila = await this.prisma.plantillaAntropometrica.findUnique({
      where: { id },
    });
    return fila ? mapear(fila) : null;
  }

  async listar(): Promise<PlantillaAntropometrica[]> {
    const filas = await this.prisma.plantillaAntropometrica.findMany({
      orderBy: { nombre: "asc" },
    });
    return filas.map(mapear);
  }
}

/**
 * `campos` es text[] en la base, así que puede contener nombres que el
 * dominio ya no conozca (una medida retirada del modelo). Se filtran acá, al
 * entrar: una plantilla vieja se degrada a los campos que siguen existiendo
 * en vez de romper la carga.
 */
function mapear(fila: PlantillaFila): PlantillaAntropometrica {
  const conocidos = new Set<string>(CAMPOS_PLANTILLA);
  return PlantillaAntropometrica.reconstruir({
    id: fila.id,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    campos: fila.campos.filter((campo): campo is CampoPlantilla =>
      conocidos.has(campo),
    ),
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
  });
}
