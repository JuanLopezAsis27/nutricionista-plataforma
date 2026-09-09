# El dashboard del profesional

`/dashboard` es la primera pantalla después de entrar. Lo que muestra tiene que
poder mirarse en diez segundos y dejar algo para hacer: por eso privilegia lo
ACCIONABLE (lo que espera respuesta) sobre lo descriptivo (cuántas cosas hay).

## Qué hay, y por qué

| Bloque              | Qué responde                                    | De dónde sale                     |
| ------------------- | ----------------------------------------------- | --------------------------------- |
| Accesos rápidos     | «quiero dar de alta algo ya»                     | enlaces                           |
| Cuatro métricas     | el pulso del día                                 | pacientes + turnos ya cargados    |
| Turnos de hoy       | a quién atiendo y en qué estado está             | turnos ya cargados                |
| Mensajes sin leer   | quién escribió y espera respuesta                | `mensajeria.conversaciones`       |
| Resumen del mes     | cómo viene el mes en plata y asistencia          | `estadisticas.obtener`            |
| Turnos por semana   | si la agenda se está llenando o vaciando         | turnos ya cargados                |
| Panel de alertas    | qué pacientes necesitan seguimiento              | `seguimiento.alertasPendientes`   |

**Casi todo se calcula sobre las dos consultas que la página ya hacía**
(pacientes y turnos). Solo dos bloques agregan una consulta —mensajes y el
resumen del mes— y las dos ya existían para otras pantallas.

## Las métricas son cuatro y son las accionables

`Pacientes activos`, `Turnos de hoy`, `Próximos (7 días)` y `Sin confirmar`.

La cuarta reemplazó a «Planes vigentes», que **contaba mal lo que decía**:
contaba los planes del consultorio, no los pacientes que siguen uno. Un
consultorio con 40 planes en la biblioteca y 3 pacientes mostraba 40.
«Sin confirmar» —turnos futuros en estado PENDIENTE— es un número con algo que
hacer detrás.

`Pacientes activos` es el total del listado, que **ya excluye a los
archivados** salvo que se pidan explícitamente.

## El reloj se lee UNA vez

`hoy` se fija en el estado al montar y todo lo demás se deriva de ahí: la
ventana de 7 días, el mes del resumen y las semanas del gráfico. Leer el reloj
en cada bloque haría que, al cruzar la medianoche, unos mostraran un día y
otros el siguiente.

Y las semanas del gráfico se calculan **en UTC** (`semanas.ts`): `Turno.fecha`
es un DATE a medianoche UTC, y con `getDay()` los turnos del lunes caerían en
la semana anterior sin que nada falle a la vista. Lo congela `semanas.test.ts`.

## El color

Cada bloque tiene su acento y lo conserva (`acentos.ts`): la tarjeta de turnos
es siempre azul y la de pacientes siempre verde, así el ojo encuentra el número
que busca sin leer los rótulos. Es orientación, no información —cada tarjeta
dice qué mide con todas las letras—, así que nada se pierde si el color no se
distingue.

Como en el plan semanal, son clases de Tailwind: es cromo de interfaz y se
apoya en la escala del tema. Los gráficos son la excepción y usan la paleta
validada de dataviz.

## Al tocar esto

- El gráfico usa la paleta compartida
  (`componentes/estadisticas/paletaGraficos.ts`), la misma —ya validada contra
  las superficies de card en claro y oscuro— que el gráfico mensual de
  Estadísticas. No copiar los hex a un tercer archivo.
- El resumen del mes **no recalcula nada**: pide el mismo
  `estadisticas.obtener` acotado al mes. Si hiciera su propia cuenta, dos
  pantallas darían cifras distintas del mismo mes.
- Un bloque nuevo que necesite una consulta nueva tiene que justificarla: el
  dashboard lo abre TODO el mundo al entrar, y cada query acá se paga en cada
  sesión.
