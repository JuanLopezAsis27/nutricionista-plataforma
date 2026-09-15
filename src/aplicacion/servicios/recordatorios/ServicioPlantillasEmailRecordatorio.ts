import type { ListarPlantillasEmailRecordatorio } from "@/aplicacion/casos-de-uso/recordatorios/ListarPlantillasEmailRecordatorio";
import type { CrearPlantillaEmailRecordatorio } from "@/aplicacion/casos-de-uso/recordatorios/CrearPlantillaEmailRecordatorio";
import type { ActualizarPlantillaEmailRecordatorio } from "@/aplicacion/casos-de-uso/recordatorios/ActualizarPlantillaEmailRecordatorio";
import type { EliminarPlantillaEmailRecordatorio } from "@/aplicacion/casos-de-uso/recordatorios/EliminarPlantillaEmailRecordatorio";
import type { PlantillaEmailRecordatorio } from "@/dominio/entidades/PlantillaEmailRecordatorio";
import type {
  ActualizarPlantillaEmailRecordatorioDto,
  GuardarPlantillaEmailRecordatorioDto,
  PlantillaEmailRecordatorioSalidaDto,
} from "../../dtos/recordatorios.dto";

/** Las plantillas de mensaje de recordatorio por email, una por escalón de anticipación. */
export class ServicioPlantillasEmailRecordatorio {
  constructor(
    private readonly listarUC: ListarPlantillasEmailRecordatorio,
    private readonly crearUC: CrearPlantillaEmailRecordatorio,
    private readonly actualizarUC: ActualizarPlantillaEmailRecordatorio,
    private readonly eliminarUC: EliminarPlantillaEmailRecordatorio,
  ) {}

  async listar(): Promise<PlantillaEmailRecordatorioSalidaDto[]> {
    const plantillas = await this.listarUC.ejecutar();
    return plantillas.map(aSalida);
  }

  async crear(
    datos: GuardarPlantillaEmailRecordatorioDto,
  ): Promise<PlantillaEmailRecordatorioSalidaDto> {
    return aSalida(
      await this.crearUC.ejecutar({
        nombre: datos.nombre,
        asunto: datos.asunto,
        cuerpoHtml: datos.cuerpoHtml,
        diasAntes: datos.diasAntes ?? null,
        predeterminada: datos.predeterminada ?? false,
        activa: datos.activa ?? true,
        incluirBotonConfirmacion: datos.incluirBotonConfirmacion ?? true,
      }),
    );
  }

  async actualizar(
    datos: ActualizarPlantillaEmailRecordatorioDto,
  ): Promise<PlantillaEmailRecordatorioSalidaDto> {
    const { id, ...cambios } = datos;
    return aSalida(await this.actualizarUC.ejecutar(id, cambios));
  }

  async eliminar(id: string): Promise<void> {
    await this.eliminarUC.ejecutar(id);
  }
}

function aSalida(
  plantilla: PlantillaEmailRecordatorio,
): PlantillaEmailRecordatorioSalidaDto {
  return plantilla.aPrimitivos();
}
