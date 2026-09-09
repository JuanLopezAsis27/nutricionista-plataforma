import type { EstablecimientoSalidaDto } from "@/aplicacion/dtos/establecimiento.dto";
import type { AgendaVigente } from "@/lib/agenda";

/**
 * Vista de la agenda: una sede concreta, o TODAS juntas.
 *
 * El calendario unificado no es un modo aparte: es esta misma pantalla con
 * `TODAS`. El profesional necesita ver su semana completa —no puede estar en
 * dos lugares a la vez, así que sus turnos son UNA agenda por más sedes que
 * tenga—, y el filtro por sede es para cuando quiere concentrarse en un lugar.
 */
export const TODAS_LAS_SEDES = "TODAS" as const;

/**
 * El id de una sede, o `TODAS_LAS_SEDES`.
 *
 * Es `string` a secas y no una unión con el literal porque TypeScript colapsa
 * `string | "TODAS"` en `string` y la unión no aportaría tipado. Quien lo
 * consuma compara contra la constante, nunca contra el texto suelto.
 */
export type SedeElegida = string;

/**
 * Colores de respaldo para las sedes que no eligieron uno.
 *
 * Se asignan por POSICIÓN en la lista (que viene ordenada por `orden` y
 * nombre), no al azar ni por hash del id: así una sede conserva su color entre
 * recargas, que es lo único que hace que el color sirva para reconocerla.
 */
const PALETA = [
  "#2563eb", // azul
  "#16a34a", // verde
  "#d97706", // ámbar
  "#9333ea", // violeta
  "#dc2626", // rojo
  "#0891b2", // cian
] as const;

/**
 * Color de cada sede: el suyo si lo eligió, uno de la paleta si no.
 *
 * El color identifica al LUGAR, no al estado del turno: en la grilla el relleno
 * del globo sigue diciendo pendiente/confirmado/completado y el color de la
 * sede va en el filo izquierdo. Si compitieran por el mismo píxel se perdería
 * uno de los dos datos.
 */
export function coloresDeSedes(
  sedes: ReadonlyArray<EstablecimientoSalidaDto>,
): Map<string, string> {
  return new Map(
    sedes.map((sede, indice) => [
      sede.id,
      sede.color ?? PALETA[indice % PALETA.length]!,
    ]),
  );
}

/**
 * La agenda que rige cuando se miran varias sedes juntas.
 *
 * - **Días**: la unión. Si el consultorio del barrio atiende sábados, el
 *   sábado no se pinta como cerrado aunque el del centro descanse. Una sola
 *   sede sin restricción (lista vacía) vuelve la unión sin restricción, que es
 *   lo mismo que significa para ella sola.
 * - **Horario**: del más temprano al más tarde. Recortar al horario de una
 *   sede escondería los turnos de la otra, que es la peor forma de perder un
 *   turno.
 * - **Paso y duración**: los más chicos, para que la grilla no saltee franjas
 *   que alguna sede sí ofrece.
 *
 * Sin sedes devuelve una agenda sin restricciones: no hay nada que unir y la
 * pantalla tiene que poder dibujarse igual.
 */
export function agendaUnificada(
  sedes: ReadonlyArray<EstablecimientoSalidaDto>,
): AgendaVigente {
  if (sedes.length === 0) {
    return {
      diasAtencion: [],
      atencionHoraDesde: null,
      atencionHoraHasta: null,
      turnoDuracionMinutos: 30,
      turnoPasoMinutos: 15,
    };
  }

  const sinRestriccionDeDias = sedes.some((s) => s.diasAtencion.length === 0);
  const dias = sinRestriccionDeDias
    ? []
    : [...new Set(sedes.flatMap((s) => s.diasAtencion))].sort((a, b) => a - b);

  // Un `null` es "sin restricción" y gana sobre cualquier hora concreta: si una
  // sede no declaró horario, la ventana no se puede acotar por la otra.
  const desde = sedes.some((s) => s.atencionHoraDesde == null)
    ? null
    : sedes.map((s) => s.atencionHoraDesde!).reduce((a, b) => (a <= b ? a : b));
  const hasta = sedes.some((s) => s.atencionHoraHasta == null)
    ? null
    : sedes.map((s) => s.atencionHoraHasta!).reduce((a, b) => (a >= b ? a : b));

  return {
    diasAtencion: dias,
    atencionHoraDesde: desde,
    atencionHoraHasta: hasta,
    turnoDuracionMinutos: Math.min(...sedes.map((s) => s.turnoDuracionMinutos)),
    turnoPasoMinutos: Math.min(...sedes.map((s) => s.turnoPasoMinutos)),
  };
}

/**
 * A qué sede pertenece cada día de la semana, cuando eso se puede decidir sin
 * ambigüedad. `null` significa "no se puede".
 *
 * Es lo que habilita agendar clickeando un hueco **en la vista unificada**. Un
 * hueco dice "acá se puede agendar", y en general eso depende de en cuál de las
 * sedes se pregunte: cada una tiene sus días y su horario. Pero hay una
 * configuración en la que la pregunta tiene una sola respuesta posible:
 *
 * 1. **Mismo horario de atención** en todas. Si difirieran, un hueco de las
 *    19:00 sería válido en una sede y tarde en otra.
 * 2. **Misma duración de turno.** Es la que decide el alto del bloque y si el
 *    turno entra antes de cerrar; con duraciones distintas el mismo hueco
 *    ocuparía distinto en cada sede.
 * 3. **Días DISJUNTOS**: ninguna comparte día con otra. Esta es la que hace el
 *    trabajo — si el centro atiende lunes y miércoles y el barrio martes y
 *    jueves, entonces "martes" YA dice "barrio" y no hay nada que preguntar.
 *
 * Una sede sin días declarados (lista vacía = "todos los días") rompe la
 * condición 3 por definición: se pisa con todas.
 *
 * El paso puede diferir y no importa: como cada día pertenece a una sola sede,
 * las franjas de ese día se calculan con la agenda de ESA sede.
 */
export function sedePorDiaDeLaSemana(
  sedes: ReadonlyArray<EstablecimientoSalidaDto>,
): Map<number, EstablecimientoSalidaDto> | null {
  if (sedes.length === 0) return null;

  const [primera, ...resto] = sedes as EstablecimientoSalidaDto[];
  const mismoHorarioYDuracion = resto.every(
    (s) =>
      s.atencionHoraDesde === primera!.atencionHoraDesde &&
      s.atencionHoraHasta === primera!.atencionHoraHasta &&
      s.turnoDuracionMinutos === primera!.turnoDuracionMinutos,
  );
  if (!mismoHorarioYDuracion) return null;

  const porDia = new Map<number, EstablecimientoSalidaDto>();
  for (const sede of sedes) {
    // Sin días declarados atiende todos: se pisa con cualquier otra.
    if (sede.diasAtencion.length === 0) return null;
    for (const dia of sede.diasAtencion) {
      if (porDia.has(dia)) return null; // dos sedes el mismo día: ambiguo
      porDia.set(dia, sede);
    }
  }
  return porDia;
}
