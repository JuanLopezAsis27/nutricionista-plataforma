import type {
  PrismaClient,
  ConfiguracionConsultorio as ConfiguracionFila,
} from "@prisma/client";
import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import { ConfiguracionConsultorio } from "@/dominio/entidades/ConfiguracionConsultorio";
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
      turnoDuracionMinutos: d.turnoDuracionMinutos,
      turnoPasoMinutos: d.turnoPasoMinutos,
      atencionHoraDesde: d.atencionHoraDesde,
      atencionHoraHasta: d.atencionHoraHasta,
      diasAtencion: d.diasAtencion,
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
    turnoDuracionMinutos: fila.turnoDuracionMinutos,
    turnoPasoMinutos: fila.turnoPasoMinutos,
    atencionHoraDesde: fila.atencionHoraDesde,
    atencionHoraHasta: fila.atencionHoraHasta,
    diasAtencion: fila.diasAtencion,
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
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
  });
}
