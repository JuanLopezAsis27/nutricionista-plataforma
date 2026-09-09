import { alcanceActual } from "./contextoTenant";

/**
 * Inquilino al que pertenece la escritura en curso.
 *
 * Desde la migración 27 `nutricionistaId` es NOT NULL con FK real, así que
 * Prisma lo exige en los tipos de escritura. Eso es deliberado: el compilador
 * pasa a reflejar lo que impone la base, en vez de confiar en que la extensión
 * de PrismaClienteSingleton lo complete en tiempo de ejecución (que además no
 * alcanzaba a las escrituras anidadas, como las comidas de un plan).
 *
 * Es fail-closed igual que la extensión: sin alcance de inquilino no se
 * escribe nada. El alcance global es para LEER (login, webhook, worker que
 * recorre inquilinos); si un flujo global necesita escribir en una tabla de
 * inquilino, tiene que decir explícitamente en cuál con `ejecutarEnNutricionista`.
 */
export function inquilinoActual(): string {
  const alcance = alcanceActual();
  if (!alcance) {
    throw new Error(
      "Escritura en una tabla de inquilino sin contexto. Falta fijar el alcance (fijarAlcance / ejecutarEnNutricionista).",
    );
  }
  if (alcance.tipo === "global") {
    throw new Error(
      "Escritura en una tabla de inquilino con alcance global. Usá ejecutarEnNutricionista(id, …) para decir a qué consultorio pertenece la fila.",
    );
  }
  return alcance.nutricionistaId;
}
