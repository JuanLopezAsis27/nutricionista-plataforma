import type { ListarPlantillasWhatsapp } from "@/aplicacion/casos-de-uso/recordatorios/ListarPlantillasWhatsapp";
import type { CrearPlantillaWhatsapp } from "@/aplicacion/casos-de-uso/recordatorios/CrearPlantillaWhatsapp";
import type { ActualizarPlantillaWhatsapp } from "@/aplicacion/casos-de-uso/recordatorios/ActualizarPlantillaWhatsapp";
import type { EliminarPlantillaWhatsapp } from "@/aplicacion/casos-de-uso/recordatorios/EliminarPlantillaWhatsapp";
import type { PlantillaWhatsapp } from "@/dominio/entidades/PlantillaWhatsapp";
import type {
  ActualizarPlantillaWhatsappDto,
  GuardarPlantillaWhatsappDto,
  PlantillaWhatsappSalidaDto,
} from "../../dtos/recordatorios.dto";

/** Las plantillas de mensaje de WhatsApp (texto libre y aprobadas en Meta). */
export class ServicioPlantillasWhatsapp {
  constructor(
    private readonly listarUC: ListarPlantillasWhatsapp,
    private readonly crearUC: CrearPlantillaWhatsapp,
    private readonly actualizarUC: ActualizarPlantillaWhatsapp,
    private readonly eliminarUC: EliminarPlantillaWhatsapp,
  ) {}

  async listar(): Promise<PlantillaWhatsappSalidaDto[]> {
    const plantillas = await this.listarUC.ejecutar();
    return plantillas.map(aSalida);
  }

  async crear(
    datos: GuardarPlantillaWhatsappDto,
  ): Promise<PlantillaWhatsappSalidaDto> {
    return aSalida(
      await this.crearUC.ejecutar({
        nombre: datos.nombre,
        cuerpo: datos.cuerpo,
        claveMeta: datos.claveMeta ?? null,
        idiomaMeta: datos.idiomaMeta ?? "es_AR",
        variablesMeta: datos.variablesMeta ?? [],
        predeterminada: datos.predeterminada ?? false,
        activa: datos.activa ?? true,
      }),
    );
  }

  async actualizar(
    datos: ActualizarPlantillaWhatsappDto,
  ): Promise<PlantillaWhatsappSalidaDto> {
    const { id, ...cambios } = datos;
    return aSalida(await this.actualizarUC.ejecutar(id, cambios));
  }

  async eliminar(id: string): Promise<void> {
    await this.eliminarUC.ejecutar(id);
  }
}

/**
 * `admiteEnvioPorApi` lo calcula la entidad y viaja con el DTO: la UI decide
 * con eso si ofrece el envío automático, sin volver a razonar la regla.
 */
function aSalida(plantilla: PlantillaWhatsapp): PlantillaWhatsappSalidaDto {
  return {
    ...plantilla.aPrimitivos(),
    admiteEnvioPorApi: plantilla.admiteEnvioPorApi,
  };
}
