import type { IPlantillaWhatsappRepositorio } from "@/dominio/repositorios/IPlantillaWhatsappRepositorio";
import type { IAdministradorPlantillasMeta } from "@/dominio/servicios/IAdministradorPlantillasMeta";
import type { IEnlaceConfirmacionTurno } from "@/dominio/servicios/IEnlaceConfirmacionTurno";
import type {
  DatosPlantillaWhatsapp,
  PlantillaWhatsapp,
} from "@/dominio/entidades/PlantillaWhatsapp";
import { variablesDelCuerpo } from "@/dominio/entidades/PlantillaWhatsapp";
import { ErrorPlantillaWhatsappNoEncontrada } from "@/dominio/errores/ErrorPlantillaWhatsappNoEncontrada";
import { desmarcarOtrasPredeterminadas } from "./predeterminada";
import { liberarDiaDeOtras } from "./diaAsignado";
import {
  definicionParaMeta,
  PROFESIONAL_DE_EJEMPLO,
} from "../whatsapp/plantillaMeta";

/**
 * Caso de uso: editar una plantilla de recordatorio por WhatsApp.
 *
 * Si la plantilla la administra la app en Meta y cambió lo que Meta revisa
 * (cuerpo, botones, categoría), la edición se manda también a Meta y la
 * plantilla vuelve a revisión. Meta va primero, por lo mismo que en el alta:
 * si la rechaza, lo guardado sigue diciendo lo que Meta tiene aprobado. Al
 * revés, la app mostraría un texto y al paciente le llegaría otro.
 *
 * Con `enviarAMeta` sobre una que todavía no está en Meta, la da de alta.
 */
export class ActualizarPlantillaWhatsapp {
  constructor(
    private readonly plantillas: IPlantillaWhatsappRepositorio,
    private readonly administrador: IAdministradorPlantillasMeta,
    private readonly enlaces: IEnlaceConfirmacionTurno,
  ) {}

  async ejecutar(
    id: string,
    cambios: Partial<DatosPlantillaWhatsapp>,
    opciones: { enviarAMeta?: boolean; ahora?: Date } = {},
  ): Promise<PlantillaWhatsapp> {
    const ahora = opciones.ahora ?? new Date();
    const plantilla = await this.plantillas.obtenerPorId(id);
    if (!plantilla) {
      throw new ErrorPlantillaWhatsappNoEncontrada(id);
    }

    const laAdministraLaApp = plantilla.enviadaAMeta || opciones.enviarAMeta;
    let actualizada = plantilla.actualizar(
      laAdministraLaApp
        ? {
            ...cambios,
            // Numeradas en orden de aparición, como se mandan a Meta.
            variablesMeta: variablesDelCuerpo(
              cambios.cuerpo ?? plantilla.cuerpo,
            ),
          }
        : cambios,
      ahora,
    );

    if (plantilla.enviadaAMeta && plantilla.idMeta) {
      if (actualizada.contenidoMetaDistintoDe(plantilla)) {
        actualizada.validarParaMeta();
        await this.administrador.editar(
          plantilla.idMeta,
          definicionParaMeta(
            actualizada,
            this.enlaces,
            PROFESIONAL_DE_EJEMPLO,
            ahora,
          ),
        );
        actualizada = actualizada.registrarEdicionEnMeta(ahora);
      }
    } else if (opciones.enviarAMeta) {
      actualizada.validarParaMeta();
      const alta = await this.administrador.crear(
        definicionParaMeta(
          actualizada,
          this.enlaces,
          PROFESIONAL_DE_EJEMPLO,
          ahora,
        ),
      );
      actualizada = actualizada.registrarAltaEnMeta(
        alta.idMeta,
        alta.estado,
        ahora,
      );
    }

    if (cambios.predeterminada) {
      await desmarcarOtrasPredeterminadas(
        this.plantillas,
        await this.plantillas.listar(),
        id,
      );
    }
    if (cambios.diasAntes != null) {
      await liberarDiaDeOtras(
        this.plantillas,
        await this.plantillas.listar(),
        cambios.diasAntes,
        id,
      );
    }
    return this.plantillas.actualizar(actualizada);
  }
}
