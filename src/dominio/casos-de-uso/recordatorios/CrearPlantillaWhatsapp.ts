import type { IPlantillaWhatsappRepositorio } from "../../repositorios/IPlantillaWhatsappRepositorio";
import type { DatosPlantillaWhatsapp } from "../../entidades/PlantillaWhatsapp";
import { PlantillaWhatsapp } from "../../entidades/PlantillaWhatsapp";
import { desmarcarOtrasPredeterminadas } from "./predeterminada";

/**
 * Caso de uso: crear una plantilla de recordatorio por WhatsApp.
 *
 * La primera plantilla del consultorio queda predeterminada aunque no lo
 * pidan. Sin predeterminada el barrido automático no manda nada, y el momento
 * en que eso se descubre es el día siguiente, cuando los recordatorios no
 * salieron: elegir por el profesional algo que puede cambiar en un clic es
 * mejor que dejarlo caer en ese pozo.
 */
export class CrearPlantillaWhatsapp {
  constructor(private readonly plantillas: IPlantillaWhatsappRepositorio) {}

  async ejecutar(datos: DatosPlantillaWhatsapp): Promise<PlantillaWhatsapp> {
    const existentes = await this.plantillas.listar();
    const predeterminada = datos.predeterminada || existentes.length === 0;

    if (predeterminada) {
      await desmarcarOtrasPredeterminadas(this.plantillas, existentes, null);
    }
    return this.plantillas.crear(
      PlantillaWhatsapp.crear(
        { ...datos, predeterminada },
        crypto.randomUUID(),
      ),
    );
  }
}
