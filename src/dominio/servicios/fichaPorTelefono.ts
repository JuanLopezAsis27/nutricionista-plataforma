/**
 * A qué ficha va un WhatsApp que llegó de un número que comparten varias
 * fichas del consultorio (migración 81): dos hermanos con el teléfono de la
 * madre, un chico y su abuelo.
 *
 * El número dice QUIÉN ESCRIBE —la madre—, no DE QUIÉN se habla. No hay forma
 * cierta de saberlo, así que se elige con pistas, de la más firme a la más
 * floja:
 *
 * 1. **El turno del botón.** Un botón de plantilla lleva en el payload el turno
 *    al que responde, y el turno es de una ficha: no hay duda.
 * 2. **La conversación en curso.** La ficha a la que el consultorio le escribió
 *    por última vez a ese número: si se le mandó el recordatorio de Sofía, lo
 *    que contesta la madre es, casi siempre, sobre Sofía.
 * 3. **La ficha más antigua.** Sin nada mejor, una elección estable: el mismo
 *    número cae siempre en el mismo hilo, en vez de repartirse al azar.
 *
 * Las pistas solo valen si nombran a una de las candidatas: un turno o un
 * mensaje de otra ficha no pueden mandar el WhatsApp fuera de este número.
 */
export function elegirFichaDelTelefono<T extends { id: string }>(
  candidatas: readonly T[],
  pistas: {
    pacienteDelTurno?: string | null;
    pacienteDelUltimoSaliente?: string | null;
  } = {},
): T | null {
  if (candidatas.length <= 1) return candidatas[0] ?? null;
  const porId = (id: string | null | undefined): T | undefined =>
    id ? candidatas.find((c) => c.id === id) : undefined;
  return (
    porId(pistas.pacienteDelTurno) ??
    porId(pistas.pacienteDelUltimoSaliente) ??
    candidatas[0]!
  );
}
