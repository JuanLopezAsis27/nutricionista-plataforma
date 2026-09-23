import type {
  ICredencialesIntegracionRepositorio,
  IntegracionCredenciales,
} from "@/dominio/repositorios/ICredencialesIntegracionRepositorio";
import type {
  EstadoCredencialesDto,
  GuardarCredencialesDto,
} from "../dtos/credenciales.dto";

/** Si la plataforma tiene IA y voz a texto (de su configuración o del entorno). */
export interface DisponibilidadIA {
  ia: boolean;
  transcripcion: boolean;
}

/**
 * Servicio de aplicación de credenciales de integración del profesional.
 * `obtenerEstado` NUNCA devuelve los secretos (solo si están configurados).
 *
 * La IA no se configura acá desde la migración 71: la carga el SUPERADMIN
 * para toda la plataforma. El consultorio solo ve si está disponible.
 */
export class ServicioCredenciales {
  constructor(
    private readonly credenciales: ICredencialesIntegracionRepositorio,
    private readonly disponibilidadIA: () => Promise<DisponibilidadIA>,
  ) {}

  async obtenerEstado(): Promise<EstadoCredencialesDto> {
    const [c, ia] = await Promise.all([
      this.credenciales.obtener(),
      this.disponibilidadIA(),
    ]);
    return {
      iaDisponible: ia.ia,
      transcripcionDisponible: ia.transcripcion,
      whatsappConfigurado: Boolean(
        c?.whatsappToken && c?.whatsappPhoneNumberId,
      ),
      whatsappPhoneNumberId: c?.whatsappPhoneNumberId ?? null,
      // Sin verify token no se puede dar de alta el webhook, y sin app secret
      // se rechaza todo lo que entre: recién con los dos hay ida y vuelta.
      whatsappWebhookListo: Boolean(
        c?.whatsappVerifyToken && c?.whatsappAppSecret,
      ),
      whatsappWabaId: c?.whatsappWabaId ?? null,
      // Crear plantillas es otra API de Meta: además del token pide el id de
      // la cuenta de WhatsApp Business, que para enviar no hace falta.
      whatsappPlantillasListas: Boolean(c?.whatsappToken && c?.whatsappWabaId),
      criterios: c?.criterios ?? {
        excluirMarcas: false,
        requiereMacros: false,
        maxCaloriasPor100: null,
        excluirTexto: [],
      },
    };
  }

  guardar(datos: GuardarCredencialesDto): Promise<void> {
    return this.credenciales.guardar(datos);
  }

  /** Da de baja una integración entera: todas sus claves de una sola vez. */
  eliminar(integracion: IntegracionCredenciales): Promise<void> {
    return this.credenciales.eliminar(integracion);
  }
}
