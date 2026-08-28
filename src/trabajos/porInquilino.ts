import type { PgBoss } from "pg-boss";
import { repositorioUsuarioCompartido } from "@/infraestructura/contenedor/contenedor";
import {
  ejecutarGlobal,
  ejecutarEnNutricionista,
} from "@/infraestructura/multitenancy/contextoTenant";

/**
 * Barridos diarios que corren una vez POR INQUILINO.
 *
 * Antes, cada barrido era UN trabajo que recorría todos los nutricionistas en
 * un `for` secuencial. Eso tenía dos problemas que no dependían de cuántos
 * inquilinos hubiera, sino de la forma:
 *
 *   - Un inquilino lento bloqueaba a los siguientes. Si el SMTP de uno se
 *     colgaba, los recordatorios de todos los que venían detrás esperaban.
 *   - Un fallo a mitad del bucle dejaba el barrido incompleto y sin reintento:
 *     pg-boss reintentaría el trabajo ENTERO, repitiendo los inquilinos que ya
 *     habían terminado bien.
 *
 * La unidad de trabajo correcta es (inquilino, día), no (barrido global). Acá
 * el cron pasa a ser un DESPACHADOR que encola un trabajo por inquilino, y
 * cada uno se procesa, falla y reintenta por su cuenta.
 *
 * Los servicios que se ejecutan son idempotentes (correrlos de nuevo no
 * reenvía ni duplica), así que reintentar es seguro.
 */

/** Datos que lleva cada trabajo de inquilino. */
interface DatosInquilino {
  nutricionistaId: string;
}

export interface TrabajoPorInquilino<R> {
  /** Nombre de la cola del despachador (la que tiene el cron). */
  nombre: string;
  /** Expresión cron, en hora local del proceso (ver TZ en .env). */
  cron: string;
  /** Se ejecuta ya dentro del alcance del inquilino. */
  ejecutar: () => Promise<R>;
  /** Resumen de una corrida, para el log. */
  describir: (resultado: R) => string;
}

/** Cola de trabajo por inquilino derivada del nombre del despachador. */
export function colaDeInquilino(nombre: string): string {
  return `${nombre}-inquilino`;
}

/**
 * Cola de fallidos del trabajo por inquilino.
 *
 * Sin esto, un inquilino que agota los reintentos simplemente desaparece: el
 * trabajo queda marcado como fallido y nadie se entera de qué consultorio se
 * quedó sin recordatorios. pg-boss copia acá el payload del trabajo agotado,
 * así que queda la constancia de a quién hay que revisarle el envío.
 */
export function colaDeFallidos(nombre: string): string {
  return `${nombre}-fallidos`;
}

/**
 * Reintentos de los trabajos por inquilino.
 *
 * Con backoff exponencial: si el SMTP o la base están caídos, no tiene sentido
 * insistir de inmediato. El tope evita que el último reintento caiga fuera del
 * día al que corresponde el barrido.
 */
const REINTENTOS = {
  retryLimit: 3,
  retryDelay: 60,
  retryBackoff: true,
  retryDelayMax: 900,
} as const;

export async function registrarTrabajoPorInquilino<R>(
  boss: PgBoss,
  trabajo: TrabajoPorInquilino<R>,
): Promise<void> {
  const colaDespacho = trabajo.nombre;
  const colaTrabajo = colaDeInquilino(colaDespacho);
  const colaFallidos = colaDeFallidos(colaDespacho);

  await boss.createQueue(colaDespacho);
  // La cola de fallidos no tiene worker a propósito: es un buzón que se
  // inspecciona a mano cuando algo se rompió, no algo que se reprocese solo.
  await boss.createQueue(colaFallidos);
  await boss.createQueue(colaTrabajo, {
    ...REINTENTOS,
    deadLetter: colaFallidos,
  });

  // --- Despachador: enumera inquilinos y encola uno por cada uno ------------
  await boss.work(colaDespacho, async () => {
    const nutris = (
      await ejecutarGlobal(() =>
        repositorioUsuarioCompartido().listarPorRol("NUTRICIONISTA"),
      )
    ).filter((u) => u.activo);

    if (nutris.length === 0) {
      console.log(`[worker] ${colaDespacho}: no hay inquilinos activos.`);
      return;
    }

    await boss.insert(
      colaTrabajo,
      nutris.map((nutri) => ({
        data: { nutricionistaId: nutri.id } satisfies DatosInquilino,
        // Evita que se apilen corridas del mismo inquilino: si la de ayer
        // todavía está pendiente o activa, la de hoy no se duplica.
        singletonKey: nutri.id,
      })),
    );

    console.log(
      `[worker] ${colaDespacho}: despachados ${nutris.length} inquilino(s).`,
    );
  });

  // --- Trabajador: un inquilino por trabajo ---------------------------------
  // El handler recibe un lote; pg-boss trae de a 1 por defecto (`batchSize`),
  // así que cada inquilino llega en su propio trabajo y falla por separado.
  await boss.work<DatosInquilino>(colaTrabajo, async (trabajos) => {
    for (const unidad of trabajos) {
      const { nutricionistaId } = unidad.data;
      // Si esto lanza, pg-boss reintenta SOLO este inquilino.
      const resultado = await ejecutarEnNutricionista(
        nutricionistaId,
        trabajo.ejecutar,
      );
      console.log(
        `[worker] ${colaTrabajo} [${nutricionistaId}]: ${trabajo.describir(resultado)}`,
      );
    }
  });

  await boss.schedule(colaDespacho, trabajo.cron);
}
