import { ZONA_HORARIA } from "../zonaHoraria";

type Consola = Pick<Console, "log" | "info" | "warn" | "error">;

const NIVELES = ["log", "info", "warn", "error"] as const;

/**
 * Marca sobre la consola ya envuelta. Con `Symbol.for` y no un símbolo del
 * módulo: en desarrollo Next puede volver a evaluar este archivo y llamar de
 * nuevo a `register()`, y cada línea saldría con dos horas.
 */
const YA_ENVUELTA = Symbol.for("nutricionista-app.horaDelLog");

/**
 * La fecha y hora en la zona del consultorio, como `21/10/2026 14:05:03`.
 *
 * Con la zona explícita y no la del proceso: `docker logs -t` ya da la hora,
 * pero en UTC, y leer el log de los recordatorios restando tres horas de
 * cabeza es la manera de equivocarse de día.
 */
export function horaLocal(
  fecha: Date = new Date(),
  zona: string = ZONA_HORARIA,
): string {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("es-AR", {
      timeZone: zona,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(fecha)
      .map((parte) => [parte.type, parte.value]),
  );
  return `${partes.day}/${partes.month}/${partes.year} ${partes.hour}:${partes.minute}:${partes.second}`;
}

/**
 * Antepone la hora local a cada línea que el proceso escribe en consola,
 * incluidas las de los casos de uso que corre (`[recordatorios] falló…`,
 * `[bienvenida] …`). Lo instalan los dos procesos al arrancar: el worker
 * (`trabajos/worker.ts`) y la app (`instrumentation.ts`).
 *
 * Las líneas JSON quedan como están: son la cabecera del monitor de errores
 * (`MonitorErroresConsola`), que ya trae su `ts` y que un agregador puede
 * parsear; con un prefijo dejaría de ser JSON.
 *
 * Llamarla dos veces no hace nada la segunda.
 */
export function anteponerHoraAlLog(
  consola: Consola = console,
  ahora: () => Date = () => new Date(),
): void {
  if (Reflect.get(consola, YA_ENVUELTA) === true) return;
  Reflect.set(consola, YA_ENVUELTA, true);
  for (const nivel of NIVELES) {
    const original = consola[nivel].bind(consola);
    consola[nivel] = (...args: unknown[]): void => {
      const primero = args[0];
      if (typeof primero === "string" && primero.startsWith("{")) {
        original(...args);
        return;
      }
      original(`[${horaLocal(ahora())}]`, ...args);
    };
  }
}
