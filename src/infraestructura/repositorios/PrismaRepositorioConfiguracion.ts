import type {
  PrismaClient,
  ConfiguracionConsultorio as ConfiguracionFila,
} from "@prisma/client";
import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import { ConfiguracionConsultorio } from "@/dominio/entidades/ConfiguracionConsultorio";

/**
 * Implementación con Prisma de la configuración del consultorio.
 * Una por nutricionista: la extensión multi-inquilino acota `findFirst` y
 * setea `nutricionistaId` en el create según el alcance de la request.
 */
export class PrismaRepositorioConfiguracion implements IConfiguracionRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async obtener(): Promise<ConfiguracionConsultorio | null> {
    const fila = await this.prisma.configuracionConsultorio.findFirst();
    return fila ? this.mapear(fila) : null;
  }

  async guardar(configuracion: ConfiguracionConsultorio): Promise<ConfiguracionConsultorio> {
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
    };
    // La config del inquilino es única; si ya existe se actualiza, si no se crea.
    const existente = await this.prisma.configuracionConsultorio.findFirst();
    const fila = existente
      ? await this.prisma.configuracionConsultorio.update({
          where: { id: existente.id },
          data: datos,
        })
      : await this.prisma.configuracionConsultorio.create({
          data: { id: d.id, ...datos },
        });
    return this.mapear(fila);
  }

  private mapear(fila: ConfiguracionFila): ConfiguracionConsultorio {
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
      creadoEn: fila.creadoEn,
      actualizadoEn: fila.actualizadoEn,
    });
  }
}
