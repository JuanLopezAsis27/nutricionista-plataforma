import type { IPlantillaEmailRecordatorioRepositorio } from "@/dominio/repositorios/IPlantillaEmailRecordatorioRepositorio";
import type { DatosPlantillaEmailRecordatorio } from "@/dominio/entidades/PlantillaEmailRecordatorio";
import { PlantillaEmailRecordatorio } from "@/dominio/entidades/PlantillaEmailRecordatorio";
import { desmarcarOtrasPredeterminadas } from "./predeterminada";
import { liberarDiaDeOtras } from "./diaAsignado";

/**
 * Caso de uso: crear una plantilla de recordatorio por email.
 *
 * La primera plantilla del consultorio queda predeterminada aunque no lo
 * pidan, igual que en WhatsApp: sin predeterminada el barrido automático no
 * manda nada, y eso se descubre el día siguiente.
 */
export class CrearPlantillaEmailRecordatorio {
  constructor(
    private readonly plantillas: IPlantillaEmailRecordatorioRepositorio,
  ) {}

  async ejecutar(
    datos: DatosPlantillaEmailRecordatorio,
  ): Promise<PlantillaEmailRecordatorio> {
    const existentes = await this.plantillas.listar();
    const predeterminada = datos.predeterminada || existentes.length === 0;

    if (predeterminada) {
      await desmarcarOtrasPredeterminadas(this.plantillas, existentes, null);
    }
    if (datos.diasAntes != null) {
      await liberarDiaDeOtras(
        this.plantillas,
        existentes,
        datos.diasAntes,
        null,
      );
    }
    return this.plantillas.crear(
      PlantillaEmailRecordatorio.crear(
        { ...datos, predeterminada },
        crypto.randomUUID(),
      ),
    );
  }
}
