/**
 * Piezas comunes de los dos hilos de conversación (el chat del portal y el de
 * WhatsApp) y de la lista de conversaciones.
 *
 * Todas las fechas de mensajería son INSTANTES (`creadoEn`, `ultimoMensajeEn`),
 * así que van en el huso de quien mira y NO con `timeZone: "UTC"`: lo que se
 * quiere leer es la hora del reloj de la pared, no la del servidor. Es la misma
 * distinción que separa `formatearFecha` de `formatearFechaHora` en
 * `lib/formato`; acá no se reutilizan porque un chat necesita otra cosa —la
 * hora sola dentro del día y un rótulo relativo entre días—.
 */

// `hour12: false` explícito: sin eso, es-AR devuelve "09:05 a. m." —tres
// caracteres de más al pie de cada burbuja, y el país usa reloj de 24 h—.
const formateadorHora = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const formateadorDia = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const formateadorDiaConAno = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const formateadorDiaSemana = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
});

/**
 * dd/mm a mano. `Intl` con solo `day` y `month` en "2-digit" igual devuelve
 * "15/1": al armar el patrón desde un esqueleto sin año, ICU ignora el ancho
 * pedido. En una columna de fechas alineadas ese ancho variable se nota.
 */
function fechaCorta(fecha: Date): string {
  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}`;
}

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** La hora del mensaje ("14:32"), en el huso de quien mira. */
export function horaChat(fecha: Date | string): string {
  return formateadorHora.format(new Date(fecha));
}

/**
 * Clave YYYY-MM-DD del día LOCAL de un instante. Es lo que agrupa las burbujas
 * bajo un separador: con la clave UTC de `aFechaISO`, un mensaje de las 22 h en
 * Argentina caería en el día siguiente y abriría un separador de más.
 */
function claveDiaLocal(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/** Días enteros de diferencia entre el día local de `fecha` y el de hoy. */
function diasDesde(fecha: Date): number {
  const dia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const hoy = new Date();
  const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((hoySinHora.getTime() - dia.getTime()) / MS_POR_DIA);
}

/**
 * Rótulo del separador de día dentro de un hilo: "Hoy", "Ayer" o la fecha
 * escrita. El año solo aparece si no es el actual — en una conversación que
 * empezó hace tres semanas, repetirlo en cada separador es ruido.
 */
export function etiquetaDia(fecha: Date | string): string {
  const d = new Date(fecha);
  const dias = diasDesde(d);
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Ayer";
  const formateador =
    d.getFullYear() === new Date().getFullYear()
      ? formateadorDia
      : formateadorDiaConAno;
  return capitalizar(formateador.format(d));
}

/**
 * Rótulo compacto para la LISTA de conversaciones, donde entra una sola línea:
 * la hora si fue hoy, "Ayer", el día de la semana dentro de la última semana y
 * la fecha corta más atrás. Una fecha dd/mm en todos los casos obliga a hacer
 * la cuenta para saber si el paciente escribió recién o el mes pasado, que es
 * justo lo que se mira al ordenar la bandeja.
 */
export function etiquetaRelativa(fecha: Date | string): string {
  const d = new Date(fecha);
  const dias = diasDesde(d);
  if (dias === 0) return horaChat(d);
  if (dias === 1) return "Ayer";
  if (dias < 7) return capitalizar(formateadorDiaSemana.format(d));
  return fechaCorta(d);
}

/** Un día del hilo con sus mensajes, en el orden en que llegaron. */
export interface DiaDeMensajes<T> {
  clave: string;
  etiqueta: string;
  mensajes: T[];
}

/**
 * Parte una lista de mensajes ya ordenada por fecha en días consecutivos.
 *
 * Un hilo sin separadores solo muestra la hora de cada burbuja, así que una
 * conversación de tres semanas se lee como si todo hubiera pasado hoy y un
 * "mañana te confirmo" no se puede ubicar en el tiempo.
 */
export function agruparPorDia<T>(
  mensajes: readonly T[],
  fechaDe: (mensaje: T) => Date | string,
): DiaDeMensajes<T>[] {
  const dias: DiaDeMensajes<T>[] = [];
  for (const mensaje of mensajes) {
    const fecha = new Date(fechaDe(mensaje));
    const clave = claveDiaLocal(fecha);
    const ultimo = dias[dias.length - 1];
    if (ultimo?.clave === clave) {
      ultimo.mensajes.push(mensaje);
    } else {
      dias.push({ clave, etiqueta: etiquetaDia(fecha), mensajes: [mensaje] });
    }
  }
  return dias;
}

/** Las iniciales del paciente, para el círculo de la lista y del encabezado. */
export function inicialesDe(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
