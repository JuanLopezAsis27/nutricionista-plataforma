import type { ServicioConfiguracionRecordatorios } from "./recordatorios/ServicioConfiguracionRecordatorios";
import type { ServicioPlantillasWhatsapp } from "./recordatorios/ServicioPlantillasWhatsapp";
import type { ServicioEnvioRecordatorios } from "./recordatorios/ServicioEnvioRecordatorios";
import type { ServicioSeguimientoRecordatorios } from "./recordatorios/ServicioSeguimientoRecordatorios";

/**
 * Fachada de Recordatorios de turno.
 *
 * Reúne los tres medios bajo una sola puerta —WhatsApp, email y calendario—
 * porque para el profesional son una sola decisión ("¿cómo aviso los turnos?")
 * aunque por dentro los ejecuten piezas distintas: el envío por WhatsApp vive
 * acá junto con el del email, y el del calendario en el sincronizador que corre
 * al agendar. Lo que este módulo centraliza es la POLÍTICA; cada medio la lee
 * donde le toca actuar.
 *
 * Como `ServicioEvaluacion`, no tiene lógica propia: agrupa cuatro servicios
 * que antes convivían en una clase con 17 dependencias de constructor.
 *
 * El reparto sigue las preguntas que se hace el profesional, no las tablas:
 *
 * - `configuracion` — *cómo aviso*: qué medios, con cuánta anticipación.
 * - `plantillas` — *qué digo*: los textos, sueltos o aprobados en Meta.
 * - `envio` — *a quién le mando ahora*: la consola y el barrido automático.
 * - `seguimiento` — *qué pasó con lo que mandé*: el historial y la
 *   confirmación manual de los envíos por enlace.
 */
export class ServicioRecordatorios {
  constructor(
    readonly configuracion: ServicioConfiguracionRecordatorios,
    readonly plantillas: ServicioPlantillasWhatsapp,
    readonly envio: ServicioEnvioRecordatorios,
    readonly seguimiento: ServicioSeguimientoRecordatorios,
  ) {}
}
