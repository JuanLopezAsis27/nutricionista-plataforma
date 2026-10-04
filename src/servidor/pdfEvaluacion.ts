import { servicioEvaluacion } from "@/infraestructura/contenedor/contenedor";
import { renderizarEvaluacionPdf } from "@/infraestructura/pdf/EvaluacionPacientePdf";
import type { PacienteSalidaDto } from "@/aplicacion/dtos/paciente.dto";
import type { ConfiguracionSalidaDto } from "@/aplicacion/dtos/configuracion.dto";

/**
 * El PDF de la evaluación integral de un paciente, como lo baja
 * `/api/pacientes/[id]/evaluacion-pdf`. Vive aparte para que el respaldo del
 * consultorio guarde el MISMO PDF que descarga el profesional, con las
 * secciones que eligió en Configuración.
 */
export async function renderizarEvaluacionDePaciente(
  paciente: PacienteSalidaDto,
  config: ConfiguracionSalidaDto,
): Promise<Buffer> {
  const evaluacion = servicioEvaluacion();
  const [historiaClinica, laboratorios, evoluciones] = await Promise.all([
    evaluacion.historiaClinica.obtener(paciente.id),
    evaluacion.laboratorios.obtener(paciente.id),
    config.pdfEvaluacionMostrarEvoluciones
      ? evaluacion.evoluciones.obtener(paciente.id)
      : null,
  ]);
  return renderizarEvaluacionPdf({
    paciente,
    historiaClinica,
    laboratorios,
    evoluciones,
    config,
  });
}
