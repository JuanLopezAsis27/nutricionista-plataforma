import type {
  PrismaClient,
  ConfiguracionConsultorio as ConfiguracionFila,
} from "@prisma/client";
import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import { ConfiguracionConsultorio } from "@/dominio/entidades/ConfiguracionConsultorio";
import { esMetodoGrasaVigente } from "@/dominio/servicios/grasaPorPliegues";
import { normalizarCamposPlantilla } from "@/dominio/entidades/PlantillaAntropometrica";
import { CAMPOS_PROTOCOLO_POR_DEFECTO } from "@/dominio/entidades/protocolosMedicion";
import type { ProtocoloComposicion } from "@/dominio/entidades/Antropometria";
import type { CampoPlantilla } from "@/dominio/entidades/PlantillaAntropometrica";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/**
 * Implementación con Prisma de la configuración del consultorio.
 * Una por nutricionista: la extensión multi-inquilino acota `findFirst` y
 * setea `nutricionistaId` en el create según el alcance de la request.
 */
export class PrismaRepositorioConfiguracion implements IConfiguracionRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async obtener(): Promise<ConfiguracionConsultorio | null> {
    const fila = await this.prisma.configuracionConsultorio.findFirst();
    return fila ? mapearConfiguracion(fila) : null;
  }

  async guardar(
    configuracion: ConfiguracionConsultorio,
  ): Promise<ConfiguracionConsultorio> {
    const d = configuracion.aPrimitivos();
    const datos = {
      nombreProfesional: d.nombreProfesional,
      matricula: d.matricula,
      logoArchivoId: d.logoArchivoId,
      pdfColorPrimario: d.pdfColorPrimario,
      pdfSubtitulo: d.pdfSubtitulo,
      pdfPieTexto: d.pdfPieTexto,
      pdfMostrarRecetas: d.pdfMostrarRecetas,
      pdfMostrarMacros: d.pdfMostrarMacros,
      pdfMostrarEquivalencias: d.pdfMostrarEquivalencias,
      pdfMostrarRecomendaciones: d.pdfMostrarRecomendaciones,
      whatsappPrefijoPais: d.whatsappPrefijoPais,
      bienvenidaAutomaticaActiva: d.bienvenidaAutomaticaActiva,
      formulasGrasaVisibles: d.formulasGrasaVisibles,
      camposDosComponentes: d.camposDosComponentes,
      camposCincoComponentes: d.camposCincoComponentes,
      analisisFotoComidaAutomatico: d.analisisFotoComidaAutomatico,
    };
    // La config del inquilino es única; si ya existe se actualiza, si no se crea.
    const existente = await this.prisma.configuracionConsultorio.findFirst();
    const fila = existente
      ? await this.prisma.configuracionConsultorio.update({
          where: { id: existente.id },
          data: datos,
        })
      : await this.prisma.configuracionConsultorio.create({
          data: { id: d.id, nutricionistaId: inquilinoActual(), ...datos },
        });
    return mapearConfiguracion(fila);
  }
}

export function mapearConfiguracion(
  fila: ConfiguracionFila,
): ConfiguracionConsultorio {
  return ConfiguracionConsultorio.reconstruir({
    id: fila.id,
    nombreProfesional: fila.nombreProfesional,
    matricula: fila.matricula,
    logoArchivoId: fila.logoArchivoId,
    pdfColorPrimario: fila.pdfColorPrimario,
    pdfSubtitulo: fila.pdfSubtitulo,
    pdfPieTexto: fila.pdfPieTexto,
    pdfMostrarRecetas: fila.pdfMostrarRecetas,
    pdfMostrarMacros: fila.pdfMostrarMacros,
    pdfMostrarEquivalencias: fila.pdfMostrarEquivalencias,
    pdfMostrarRecomendaciones: fila.pdfMostrarRecomendaciones,
    whatsappPrefijoPais: fila.whatsappPrefijoPais,
    bienvenidaAutomaticaActiva: fila.bienvenidaAutomaticaActiva,
    // Filtra por si la fila arrastrara un método ya retirado: el enum de
    // Postgres no se toca a propósito (ver el mismo criterio en el mapeador
    // de Antropometria).
    formulasGrasaVisibles:
      fila.formulasGrasaVisibles.filter(esMetodoGrasaVigente),
    camposDosComponentes: camposDelProtocolo(
      "DOS_COMPONENTES",
      fila.camposDosComponentes,
    ),
    camposCincoComponentes: camposDelProtocolo(
      "CINCO_COMPONENTES",
      fila.camposCincoComponentes,
    ),
    analisisFotoComidaAutomatico: fila.analisisFotoComidaAutomatico,
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
  });
}

/**
 * Campos guardados de un protocolo, o los de fábrica si la fila no los tiene.
 *
 * La columna arranca vacía (migración 70) y vacío significa «nunca se
 * personalizó»: se resuelve acá, al leer, y no con un backfill, para que sumar
 * una medida al protocolo la haga aparecer sola en los consultorios que no lo
 * tocaron. `normalizarCamposPlantilla` descarta además cualquier campo que ya
 * no exista, como el filtro de métodos de grasa de arriba.
 */
function camposDelProtocolo(
  protocolo: ProtocoloComposicion,
  guardados: string[],
): CampoPlantilla[] {
  const campos = normalizarCamposPlantilla(guardados ?? []);
  return campos.length > 0
    ? campos
    : [...CAMPOS_PROTOCOLO_POR_DEFECTO[protocolo]];
}
