# Estadísticas: el período y los cobros por venir

La pantalla `/dashboard/estadisticas` tiene dos lecturas con horizontes
distintos, y es a propósito.

## El período mira hacia atrás

`estadisticas.obtener` recibe `desde`/`hasta` y la pantalla manda `hasta = hoy`
(«Este mes», «3 meses», «12 meses»). Para pacientes nuevos, asistencia y la
serie mensual eso es lo correcto: no hay asistencia de un turno que no pasó.

Para la plata no alcanza. Con el período solo, **un turno con fecha posterior
a hoy no aparecía en ningún número**: ni el que el paciente pagó por
adelantado, ni el que falta cobrar el jueves de esta misma semana. Por eso las
dos tarjetas de plata del período dicen ahora «del período» y «hasta hoy»: lo
pendiente ahí es lo que ya se atendió y no se cobró.

## Cobros por venir

`estadisticas.resumenCobros` (`ObtenerResumenCobros`) no recibe período:

| Número                  | Turnos que cuenta                                         |
| ----------------------- | --------------------------------------------------------- |
| Cobrado esta semana     | lunes a domingo de la semana en curso, pagados            |
| Por cobrar esta semana  | ídem, con precio, sin pagar y no cancelados               |
| Por cobrar a futuro     | fecha posterior a hoy, con precio, sin pagar, no cancelados |
| Pagado por adelantado   | fecha posterior a hoy, pagados                            |

- **Hoy lo dice el servidor** (`IRelojFecha.hoy()`, día local a medianoche
  UTC), no el navegador. La semana arranca en lunes, como el resto de la app,
  y se calcula con `getUTCDay()` por el mismo motivo que los turnos.
- La semana incluye sus días ya pasados: lo pendiente de la semana es también
  el turno del lunes que no se pagó. Por eso «esta semana» y «a futuro» se
  pisan en los días de la semana posteriores a hoy; son dos preguntas
  distintas, no dos partes de un total, y no se suman.
- Los criterios son los mismos que los del período (`cobrosEntre` en
  `PrismaRepositorioEstadisticas`): un cancelado no es plata pendiente, y lo
  pagado cuenta aunque el turno se haya cancelado después.
- `Turno.fecha` es un DATE, así que `lte: hasta` incluye el domingo entero.

## Ocultar los montos

El ojo junto a los rangos oculta **toda** cifra de plata de la pantalla
(período, cobros por venir y la tabla por establecimiento) como `$ ******`; los
conteos de turnos quedan a la vista. Lo resuelve `useIngresosVisibles`
(`lib/hooks/`), que es el mismo del resumen del mes del dashboard:

- Es una preferencia **de quien mira**, no del consultorio: sirve para abrir la
  app con un paciente al lado. Por eso vive en `localStorage` del dispositivo
  y no en la base.
- Es **una sola** para las dos pantallas (se avisan con un evento en la misma
  pestaña y con `storage` entre pestañas): ocultar en una y encontrar la plata
  a la vista en la otra no protege nada.
- En el servidor y en la hidratación sale **oculto**: si la preferencia es
  ocultar, el monto no llega a verse ni un instante.
- Un monto nuevo en estas pantallas va por `ingresos.monto(valor)`, no por
  `formatearMoneda`, o queda afuera del ocultamiento sin que nada falle.
