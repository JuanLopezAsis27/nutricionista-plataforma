import type {
  PrismaClient,
  ConfiguracionRecordatorios as ConfiguracionFila,
} from "@prisma/client";
import type { IConfiguracionRecordatoriosRepositorio } from "@/dominio/repositorios/IConfiguracionRecordatoriosRepositorio";
import { ConfiguracionRecordatorios } from "@/dominio/entidades/ConfiguracionRecordatorios";
import { inquilinoActual } from "@/infraestructura/multitenancy/inquilino";

/**
 * Implementación con Prisma de la configuración de recordatorios.
 * Una por nutricionista: la extensión multi-inquilino acota `findFirst` y
 * setea `nutricionistaId` en el create según el alcance de la request.
 */
export class PrismaRepositorioConfiguracionRecordatorios implements IConfiguracionRecordatoriosRepositorio {
  constructor(private readonly prisma: PrismaClient) {}

  async obtener(): Promise<ConfiguracionRecordatorios | null> {
    const fila = await this.prisma.configuracionRecordatorios.findFirst();
    return fila ? mapearConfiguracionRecordatorios(fila) : null;
  }

  async guardar(
    configuracion: ConfiguracionRecordatorios,
  ): Promise<ConfiguracionRecordatorios> {
    const d = configuracion.aPrimitivos();
    const datos = {
      whatsappActivo: d.whatsappActivo,
      whatsappAutomatico: d.whatsappAutomatico,
      whatsappDiasAntes: d.whatsappDiasAntes,
      emailActivo: d.emailActivo,
      emailAutomatico: d.emailAutomatico,
      emailDiasAntes: d.emailDiasAntes,
      calendarioActivo: d.calendarioActivo,
      calendarioInvitarPaciente: d.calendarioInvitarPaciente,
      calendarioMinutosAntes: d.calendarioMinutosAntes,
      horaEnvio: d.horaEnvio,
      horasEntreAvisos: d.horasEntreAvisos,
    };
    // La config del inquilino es única; si ya existe se actualiza, si no se crea.
    const existente = await this.prisma.configuracionRecordatorios.findFirst();
    const fila = existente
      ? await this.prisma.configuracionRecordatorios.update({
          where: { id: existente.id },
          data: datos,
        })
      : await this.prisma.configuracionRecordatorios.create({
          data: { id: d.id, nutricionistaId: inquilinoActual(), ...datos },
        });
    return mapearConfiguracionRecordatorios(fila);
  }
}

export function mapearConfiguracionRecordatorios(
  fila: ConfiguracionFila,
): ConfiguracionRecordatorios {
  return ConfiguracionRecordatorios.reconstruir({
    id: fila.id,
    whatsappActivo: fila.whatsappActivo,
    whatsappAutomatico: fila.whatsappAutomatico,
    whatsappDiasAntes: fila.whatsappDiasAntes,
    emailActivo: fila.emailActivo,
    emailAutomatico: fila.emailAutomatico,
    emailDiasAntes: fila.emailDiasAntes,
    calendarioActivo: fila.calendarioActivo,
    calendarioInvitarPaciente: fila.calendarioInvitarPaciente,
    calendarioMinutosAntes: fila.calendarioMinutosAntes,
    horaEnvio: fila.horaEnvio,
    horasEntreAvisos: fila.horasEntreAvisos,
    creadoEn: fila.creadoEn,
    actualizadoEn: fila.actualizadoEn,
  });
}
