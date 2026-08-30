import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { IPacienteRepositorio } from "@/dominio/repositorios/IPacienteRepositorio";
import type { IConfiguracionRepositorio } from "@/dominio/repositorios/IConfiguracionRepositorio";
import type { IPlantillaWhatsappRepositorio } from "@/dominio/repositorios/IPlantillaWhatsappRepositorio";
import type { IProveedorWhatsapp } from "@/dominio/servicios/IProveedorWhatsapp";
import { ConfiguracionConsultorio } from "@/dominio/entidades/ConfiguracionConsultorio";
import { ErrorTurnoNoEncontrado } from "@/dominio/errores/ErrorTurnoNoEncontrado";
import { ErrorPacienteNoEncontrado } from "@/dominio/errores/ErrorPacienteNoEncontrado";
import { ErrorPlantillaWhatsappNoEncontrada } from "@/dominio/errores/ErrorPlantillaWhatsappNoEncontrada";
import { armarRecordatorio } from "./armadoRecordatorio";

/** Lo que ve el profesional antes de mandar el recordatorio de un turno. */
export interface VistaPreviaRecordatorio {
  turnoId: string;
  pacienteId: string;
  nombrePaciente: string;
  telefono: string;
  /** Texto ya armado con los datos del turno, listo para retocar. */
  mensaje: string;
  modo: "ENLACE" | "API";
  /**
   * La plantilla saldría por la vía aprobada de Meta. Importa porque retocar
   * el texto la baja a texto libre, y eso fuera de la ventana de 24 h no sale.
   */
  usaPlantillaAprobada: boolean;
}

/**
 * Caso de uso: armar la vista previa del recordatorio de un turno.
 *
 * NO manda nada, y eso hay que sostenerlo: la versión anterior llamaba a
 * `proveedor.preparar()`, que con la Cloud API conectada ENVÍA el mensaje, y
 * como esto viaja por un query de tRPC —que el cliente refresca solo al
 * reenfocar la ventana— abrir el diálogo un par de veces le mandaba varios
 * recordatorios al paciente sin que nadie apretara nada.
 *
 * Usa el MISMO armado que el envío: si la vista previa mostrara otra cosa que
 * la que después sale, el error solo se descubriría del lado del paciente.
 */
export class ObtenerVistaPreviaRecordatorio {
  constructor(
    private readonly turnos: ITurnoRepositorio,
    private readonly pacientes: IPacienteRepositorio,
    private readonly configuracion: IConfiguracionRepositorio,
    private readonly plantillas: IPlantillaWhatsappRepositorio,
    private readonly proveedor: IProveedorWhatsapp,
  ) {}

  async ejecutar(
    turnoId: string,
    plantillaId?: string | null,
  ): Promise<VistaPreviaRecordatorio> {
    const turno = await this.turnos.obtenerPorId(turnoId);
    if (!turno) {
      throw new ErrorTurnoNoEncontrado(turnoId);
    }
    const paciente = await this.pacientes.obtenerPorId(turno.pacienteId);
    if (!paciente) {
      throw new ErrorPacienteNoEncontrado(turno.pacienteId);
    }
    const plantilla = plantillaId
      ? await this.plantillas.obtenerPorId(plantillaId)
      : await this.plantillas.obtenerPredeterminada();
    if (!plantilla) {
      throw new ErrorPlantillaWhatsappNoEncontrada(
        plantillaId ?? "predeterminada",
      );
    }
    const config =
      (await this.configuracion.obtener()) ??
      ConfiguracionConsultorio.porDefecto();

    const armado = armarRecordatorio(turno, paciente, config, plantilla);

    return {
      turnoId: turno.id,
      pacienteId: paciente.id,
      nombrePaciente: armado.nombrePaciente,
      telefono: armado.telefono,
      mensaje: armado.mensaje,
      modo: await this.proveedor.modoActual(),
      usaPlantillaAprobada: armado.envioPlantilla != null,
    };
  }
}
