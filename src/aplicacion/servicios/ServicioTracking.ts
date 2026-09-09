import type {
  ObtenerTrackingDePaciente,
  TrackingPaciente,
} from "@/aplicacion/casos-de-uso/tracking/ObtenerTrackingDePaciente";

/**
 * Servicio de aplicación del Tracking del paciente: expone el read-model de
 * progreso (adherencia a los axiomas, concordancia con el plan y evolución de
 * peso). Lo consumen el portal del paciente y la ficha del nutricionista.
 */
export class ServicioTracking {
  constructor(private readonly obtenerUC: ObtenerTrackingDePaciente) {}

  obtener(
    pacienteId: string,
    desde: Date,
    hasta: Date,
  ): Promise<TrackingPaciente> {
    return this.obtenerUC.ejecutar(pacienteId, desde, hasta);
  }
}
