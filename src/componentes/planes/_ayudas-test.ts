import type { PlanSalidaDto } from "@/aplicacion/dtos/plan.dto";

/**
 * Ayudas de test de las pantallas de planes.
 *
 * Un `PlanSalidaDto` tiene veinte campos y cada test de pantalla necesita uno
 * entero para que `VistaPlan` dibuje. Estaba copiado en tres tests —la ficha
 * del paciente y las dos páginas de «Mi plan»—, y un campo nuevo en el DTO
 * obligaba a encontrar las tres copias.
 */

/**
 * Un plan de la app con UNA franja y UNA opción, lo mínimo para que
 * `VistaPlan` dibuje. El contenido de la opción es `Opción de <nombre>`: es lo
 * que los tests buscan para saber si el plan está ABIERTO en pantalla (una
 * tarjeta muestra el nombre, no las opciones).
 */
export function planDeEjemplo(
  id: string,
  nombre: string,
  extra: Partial<PlanSalidaDto> = {},
): PlanSalidaDto {
  return {
    id,
    nombre,
    descripcion: null,
    esPlantilla: false,
    planOrigenId: null,
    archivado: false,
    caloriasMeta: null,
    proteinasMetaG: null,
    carbohidratosMetaG: null,
    grasasMetaG: null,
    contactosUtiles: null,
    comidas: [
      {
        id: `${id}-c1`,
        nombre: "Desayuno",
        horaDesde: null,
        horaHasta: null,
        orden: 0,
        opciones: [
          {
            id: `${id}-o1`,
            numero: 1,
            contenido: `Opción de ${nombre}`,
            recetaId: null,
            recetaNombre: null,
            recetaMacros: null,
            orden: 0,
          },
        ],
      },
    ],
    equivalencias: [],
    recomendaciones: [],
    modalidad: "APP",
    grupoId: null,
    grupoNombre: null,
    documentos: [],
    adjuntos: [],
    recetasVinculadas: [],
    creadoEn: new Date("2026-01-01"),
    actualizadoEn: new Date("2026-01-01"),
    ...extra,
  };
}
