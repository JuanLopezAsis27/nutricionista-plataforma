import type { PgBoss } from "pg-boss";
import { servicioGrabaciones } from "@/infraestructura/contenedor/contenedor";
import {
  ejecutarGlobal,
  ejecutarEnNutricionista,
} from "@/infraestructura/multitenancy/contextoTenant";
import { COLA_TRANSCRIBIR_GRABACION } from "@/aplicacion/casos-de-uso/grabaciones/RegistrarGrabacion";

/** Cola del barrido que rescata las grabaciones que quedaron colgadas. */
export const COLA_RESCATE_GRABACIONES = "rescatar-grabaciones";

/** Cuántas rescata cada corrida. Suficiente para un consultorio, acotado. */
const LOTE_RESCATE = 20;

/**
 * Reintentos de pg-boss para la transcripción.
 *
 * Son POCOS y con backoff porque la política de verdad vive en la entidad
 * (`intentos` / `MAX_INTENTOS_TRANSCRIPCION`): el caso de uso no lanza cuando
 * el proveedor falla, anota el motivo y devuelve. Estos reintentos cubren la
 * otra clase de fallo —el proceso que se muere o la base que no responde—, que
 * es la que sí hace lanzar.
 */
const REINTENTOS = {
  retryLimit: 2,
  retryDelay: 30,
  retryBackoff: true,
} as const;

/**
 * Transcripción de las grabaciones de consulta.
 *
 * Dos entradas al mismo trabajo:
 *
 *  - **La cola**, que se llena cuando el profesional termina de grabar. Es el
 *    camino normal y el que hace que la transcripción aparezca en un rato.
 *  - **El barrido**, cada 10 minutos, que levanta lo que quedó PENDIENTE o
 *    TRANSCRIBIENDO. Cubre el encolado que falló (la app guardó la fila pero no
 *    pudo hablar con pg-boss) y el worker que murió a mitad de un audio. Sin
 *    esto, esas grabaciones se quedaban esperando para siempre y el
 *    profesional no tenía forma de enterarse.
 *
 * El inquilino NO viaja en el trabajo: se lee de la fila en alcance global y
 * recién ahí se fija el alcance. Mandarlo en el payload sería una segunda copia
 * del vínculo, y una que nadie valida contra la fila.
 */
export async function registrarTranscribirGrabaciones(
  boss: PgBoss,
): Promise<void> {
  await boss.createQueue(COLA_TRANSCRIBIR_GRABACION, REINTENTOS);
  await boss.createQueue(COLA_RESCATE_GRABACIONES);

  await boss.work<{ grabacionId: string }>(
    COLA_TRANSCRIBIR_GRABACION,
    async (trabajos) => {
      for (const unidad of trabajos) {
        await procesar(unidad.data.grabacionId);
      }
    },
  );

  await boss.work(COLA_RESCATE_GRABACIONES, async () => {
    const pendientes = await ejecutarGlobal(() =>
      servicioGrabaciones().pendientesGlobal(LOTE_RESCATE),
    );
    if (pendientes.length === 0) return;

    console.log(
      `[worker] rescate de grabaciones: ${pendientes.length} pendiente(s).`,
    );
    for (const pendiente of pendientes) {
      // Cada una en su propio alcance y con su propio try: un consultorio con
      // la clave vencida no puede frenar el rescate de los demás.
      try {
        await ejecutarEnNutricionista(pendiente.nutricionistaId, () =>
          servicioGrabaciones().transcribir(pendiente.id),
        );
      } catch (error) {
        console.error(
          `[worker] rescate de la grabación ${pendiente.id} falló:`,
          error,
        );
      }
    }
  });

  await boss.schedule(COLA_RESCATE_GRABACIONES, "*/10 * * * *");
}

/** Resuelve el consultorio de la grabación y la transcribe en su alcance. */
async function procesar(grabacionId: string): Promise<void> {
  const nutricionistaId = await ejecutarGlobal(() =>
    servicioGrabaciones().inquilinoDe(grabacionId),
  );
  if (!nutricionistaId) {
    // La grabación se borró entre el encolado y el procesamiento. No es un
    // error: si lanzara, pg-boss reintentaría un id que ya no existe.
    console.log(
      `[worker] grabación ${grabacionId} ya no existe; se descarta el trabajo.`,
    );
    return;
  }

  const resultado = await ejecutarEnNutricionista(nutricionistaId, () =>
    servicioGrabaciones().transcribir(grabacionId),
  );

  console.log(
    `[worker] grabación ${grabacionId} [${nutricionistaId}]: ${describir(resultado)}`,
  );
}

function describir(
  resultado: Awaited<ReturnType<ServicioTranscribir>>,
): string {
  switch (resultado.estado) {
    case "TRANSCRITA":
      return `transcrita (${resultado.caracteres} caracteres).`;
    case "OMITIDA":
      return `omitida: ${resultado.motivo}`;
    case "FALLIDA":
      return resultado.volveraAIntentarse
        ? `falló y se reintentará: ${resultado.motivo}`
        : `falló definitivamente: ${resultado.motivo}`;
  }
}

type ServicioTranscribir = ReturnType<
  typeof servicioGrabaciones
>["transcribir"];
