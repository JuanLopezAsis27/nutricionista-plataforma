import {
  servicioConfiguracion,
  servicioReceta,
} from "@/infraestructura/contenedor/contenedor";
import { renderizarPlanPdf } from "@/infraestructura/pdf/PlanNutricionalPdf";
import type { PlanSalidaDto } from "@/aplicacion/dtos/plan.dto";
import type { RecetaSalidaDto } from "@/aplicacion/dtos/receta.dto";
import type { ConfiguracionSalidaDto } from "@/aplicacion/dtos/configuracion.dto";

/**
 * El PDF de un plan con sus recetas, como lo baja `/api/planes/[id]/pdf`.
 * Vive aparte para que el respaldo del consultorio dibuje el MISMO PDF que
 * descarga el profesional.
 */
export async function renderizarPlanConRecetas(datos: {
  plan: PlanSalidaDto;
  nombrePaciente: string | null;
  /** Se lee si no viene: el respaldo la pasa para no leerla una vez por plan. */
  config?: ConfiguracionSalidaDto;
}): Promise<Buffer> {
  const { plan, nombrePaciente } = datos;
  const config = datos.config ?? (await servicioConfiguracion().obtener());

  // Recetas referenciadas por las opciones del plan (únicas, en orden de aparición).
  const recetaIds = [
    ...new Set(
      plan.comidas.flatMap((c) =>
        c.opciones
          .map((o) => o.recetaId)
          .filter((rid): rid is string => Boolean(rid)),
      ),
    ),
  ];
  let recetas: RecetaSalidaDto[] = [];
  if (config.pdfMostrarRecetas && recetaIds.length > 0) {
    const resueltas = await Promise.all(
      recetaIds.map((rid) =>
        servicioReceta()
          .obtenerRecetaPorId(rid)
          .catch(() => null),
      ),
    );
    recetas = resueltas.filter((r): r is RecetaSalidaDto => r !== null);
  }

  return renderizarPlanPdf({ plan, nombrePaciente, recetas, config });
}
