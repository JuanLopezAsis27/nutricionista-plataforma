import type { ListarPlantillasWhatsapp } from "@/aplicacion/casos-de-uso/recordatorios/ListarPlantillasWhatsapp";
import type { CrearPlantillaWhatsapp } from "@/aplicacion/casos-de-uso/recordatorios/CrearPlantillaWhatsapp";
import type { ActualizarPlantillaWhatsapp } from "@/aplicacion/casos-de-uso/recordatorios/ActualizarPlantillaWhatsapp";
import type { EliminarPlantillaWhatsapp } from "@/aplicacion/casos-de-uso/recordatorios/EliminarPlantillaWhatsapp";
import type { SincronizarPlantillasMeta } from "@/aplicacion/casos-de-uso/recordatorios/SincronizarPlantillasMeta";
import type { RegistrarEstadosPlantillasMeta } from "@/aplicacion/casos-de-uso/recordatorios/RegistrarEstadosPlantillasMeta";
import type { PlantillaWhatsapp } from "@/dominio/entidades/PlantillaWhatsapp";
import type { EstadoPlantillaRemota } from "@/dominio/servicios/IAdministradorPlantillasMeta";
import type {
  ActualizarPlantillaWhatsappDto,
  GuardarPlantillaWhatsappDto,
  PlantillaWhatsappSalidaDto,
} from "../../dtos/recordatorios.dto";

/**
 * Las plantillas de mensaje de WhatsApp (texto libre y aprobadas en Meta), y
 * su alta y seguimiento en Meta.
 */
export class ServicioPlantillasWhatsapp {
  constructor(
    private readonly listarUC: ListarPlantillasWhatsapp,
    private readonly crearUC: CrearPlantillaWhatsapp,
    private readonly actualizarUC: ActualizarPlantillaWhatsapp,
    private readonly eliminarUC: EliminarPlantillaWhatsapp,
    private readonly sincronizarUC: SincronizarPlantillasMeta,
    private readonly registrarEstadosUC: RegistrarEstadosPlantillasMeta,
  ) {}

  async listar(): Promise<PlantillaWhatsappSalidaDto[]> {
    const plantillas = await this.listarUC.ejecutar();
    return plantillas.map(aSalida);
  }

  async crear(
    datos: GuardarPlantillaWhatsappDto,
  ): Promise<PlantillaWhatsappSalidaDto> {
    return aSalida(
      await this.crearUC.ejecutar(
        {
          nombre: datos.nombre,
          cuerpo: datos.cuerpo,
          claveMeta: datos.claveMeta ?? null,
          idiomaMeta: datos.idiomaMeta ?? "es_AR",
          variablesMeta: datos.variablesMeta ?? [],
          diasAntes: datos.diasAntes ?? null,
          predeterminada: datos.predeterminada ?? false,
          activa: datos.activa ?? true,
          categoriaMeta: datos.categoriaMeta,
          botones: datos.botones,
        },
        { enviarAMeta: datos.enviarAMeta ?? false },
      ),
    );
  }

  async actualizar(
    datos: ActualizarPlantillaWhatsappDto,
  ): Promise<PlantillaWhatsappSalidaDto> {
    const { id, enviarAMeta, ...cambios } = datos;
    return aSalida(
      await this.actualizarUC.ejecutar(id, cambios, {
        enviarAMeta: enviarAMeta ?? false,
      }),
    );
  }

  async eliminar(id: string): Promise<void> {
    await this.eliminarUC.ejecutar(id);
  }

  /** Trae de Meta el estado de todas las plantillas. Devuelve cuántas cambiaron. */
  async sincronizarConMeta(): Promise<number> {
    return this.sincronizarUC.ejecutar();
  }

  /** Estados que llegaron por el webhook de Meta, ya acotado al inquilino. */
  async registrarEstadosMeta(
    estados: EstadoPlantillaRemota[],
  ): Promise<number> {
    if (estados.length === 0) return 0;
    return this.registrarEstadosUC.ejecutar(estados);
  }
}

/**
 * Lo que calcula la entidad viaja con el DTO (`admiteEnvioPorApi`,
 * `necesitaTurno`): la UI decide con eso, sin volver a razonar la regla.
 */
function aSalida(plantilla: PlantillaWhatsapp): PlantillaWhatsappSalidaDto {
  return {
    ...plantilla.aPrimitivos(),
    enviadaAMeta: plantilla.enviadaAMeta,
    necesitaTurno: plantilla.necesitaTurno,
    admiteEnvioPorApi: plantilla.admiteEnvioPorApi,
    avisoEnvio: plantilla.avisoDeEnvio(),
  };
}
