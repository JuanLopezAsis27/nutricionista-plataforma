import type { IPlantillaWhatsappRepositorio } from "@/dominio/repositorios/IPlantillaWhatsappRepositorio";
import type { IAdministradorPlantillasMeta } from "@/dominio/servicios/IAdministradorPlantillasMeta";
import type { IEnlacesTurno } from "@/dominio/servicios/IEnlacesTurno";
import type { DatosPlantillaWhatsapp } from "@/dominio/entidades/PlantillaWhatsapp";
import {
  PlantillaWhatsapp,
  variablesDelCuerpo,
} from "@/dominio/entidades/PlantillaWhatsapp";
import { desmarcarOtrasPredeterminadas } from "./predeterminada";
import { liberarDiaDeOtras } from "./diaAsignado";
import {
  definicionParaMeta,
  PROFESIONAL_DE_EJEMPLO,
} from "../whatsapp/plantillaMeta";

/**
 * Caso de uso: crear una plantilla de recordatorio por WhatsApp.
 *
 * La primera plantilla del consultorio queda predeterminada aunque no lo
 * pidan. Sin predeterminada el barrido automático no manda nada, y el momento
 * en que eso se descubre es el día siguiente, cuando los recordatorios no
 * salieron: elegir por el profesional algo que puede cambiar en un clic es
 * mejor que dejarlo caer en ese pozo.
 *
 * Con `enviarAMeta`, además la da de alta en Meta y la manda a revisión. Meta
 * va PRIMERO: si la rechaza (nombre repetido, formato), no se guarda nada y el
 * profesional corrige sobre el mismo formulario. Al revés quedaría una
 * plantilla local que dice ser de Meta sin serlo.
 */
export class CrearPlantillaWhatsapp {
  constructor(
    private readonly plantillas: IPlantillaWhatsappRepositorio,
    private readonly administrador: IAdministradorPlantillasMeta,
    private readonly enlaces: IEnlacesTurno,
  ) {}

  async ejecutar(
    datos: DatosPlantillaWhatsapp,
    opciones: { enviarAMeta?: boolean; ahora?: Date } = {},
  ): Promise<PlantillaWhatsapp> {
    const ahora = opciones.ahora ?? new Date();
    const existentes = await this.plantillas.listar();
    const predeterminada = datos.predeterminada || existentes.length === 0;

    let plantilla = PlantillaWhatsapp.crear(
      {
        ...datos,
        predeterminada,
        // La que da de alta la app numera las variables en orden de
        // aparición: no hay un orden "de Meta" que respetar.
        variablesMeta: opciones.enviarAMeta
          ? variablesDelCuerpo(datos.cuerpo)
          : datos.variablesMeta,
      },
      crypto.randomUUID(),
      ahora,
    );

    if (opciones.enviarAMeta) {
      plantilla.validarParaMeta();
      const alta = await this.administrador.crear(
        definicionParaMeta(
          plantilla,
          this.enlaces,
          PROFESIONAL_DE_EJEMPLO,
          ahora,
        ),
      );
      plantilla = plantilla.registrarAltaEnMeta(
        alta.idMeta,
        alta.estado,
        ahora,
      );
    }

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
    return this.plantillas.crear(plantilla);
  }
}
