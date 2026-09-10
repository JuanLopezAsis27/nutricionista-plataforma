import type { AvanceIA, AlAvanzarIA } from "@/dominio/servicios/avanceIA";
import { ErrorDominio } from "@/dominio/errores/ErrorDominio";
import { monitorErrores } from "@/infraestructura/monitoreo/monitor";
import type { EventoIA } from "@/aplicacion/dtos/ia.dto";

const MENSAJE_GENERICO =
  "Ocurrió un error inesperado. Volvé a intentarlo en unos minutos.";

/**
 * Convierte un trabajo que EMPUJA avances (callback) en un iterable que los
 * TIRA de a uno (async generator), que es lo que consume una subscription tRPC.
 *
 * El trabajo arranca acá, de forma síncrona, y no dentro del generador. Es
 * deliberado y es lo que hace que esto funcione: el alcance de inquilino vive
 * en un `AsyncLocalStorage` que se fija en el entry point HTTP, y un async
 * generator corre su cuerpo recién en el primer `next()` —ya fuera de ese
 * alcance—, así que las consultas del caso de uso saldrían sin inquilino y
 * Prisma no devolvería nada. Arrancando en el resolver, todo el árbol async
 * hereda el alcance de la request.
 *
 * Los avances que lleguen mientras nadie está esperando se acumulan en la cola;
 * ninguno se pierde aunque el modelo escriba más rápido de lo que el cliente lee.
 */
export function iniciarFlujoIA<T>(
  ruta: string,
  trabajo: (alAvanzar: AlAvanzarIA) => Promise<T>,
): AsyncIterable<EventoIA<T>> {
  const cola: AvanceIA[] = [];
  let despertar: (() => void) | null = null;

  const avisar = () => {
    despertar?.();
    despertar = null;
  };

  let terminado = false;
  let cierre: EventoIA<T> | null = null;

  // El manejo del rechazo se engancha ya mismo, no dentro del generador: si
  // esperáramos al primer `next()`, un fallo temprano sería un "unhandled
  // rejection" y tumbaría el proceso.
  const espera = trabajo((avance) => {
    cola.push(avance);
    avisar();
  }).then(
    (resultado) => {
      cierre = { tipo: "fin", resultado };
      terminado = true;
      avisar();
    },
    (error: unknown) => {
      cierre = { tipo: "error", mensaje: mensajeDe(error, ruta) };
      terminado = true;
      avisar();
    },
  );

  return {
    async *[Symbol.asyncIterator]() {
      for (;;) {
        while (cola.length > 0) {
          yield cola.shift()!;
        }
        if (terminado) break;
        await new Promise<void>((resolver) => {
          despertar = resolver;
        });
      }
      await espera;
      yield cierre!;
    },
  };
}

/**
 * Qué se le dice al usuario, con el mismo criterio que el middleware de errores
 * de tRPC: los errores de dominio llevan un mensaje escrito para leerse (un
 * modelo mal cargado, una cuota agotada) y van tal cual; cualquier otro se
 * reporta al monitor y sale genérico, porque su texto interno puede traer datos
 * de infraestructura.
 */
function mensajeDe(error: unknown, ruta: string): string {
  if (error instanceof ErrorDominio) return error.message;
  monitorErrores.capturar(error, { origen: "trpc", ruta });
  return MENSAJE_GENERICO;
}
