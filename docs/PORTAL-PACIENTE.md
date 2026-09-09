# El portal del paciente

Las pantallas de `src/app/(paciente)`: lo que ve quien entra con rol PACIENTE.
Es la mitad de la aplicación que se abre **todos los días y desde un teléfono**
—la app Android es este mismo portal envuelto en Capacitor, ver `MOBILE.md`—,
y esa es la diferencia de fondo con el panel del nutricionista, que se usa
sentado frente a una pantalla grande durante la consulta.

## Qué hay

| Ruta               | Qué muestra                                          |
| ------------------ | ---------------------------------------------------- |
| `/mi-inicio`       | Hoy: turno, qué comer, registro rápido, accesos      |
| `/mi-plan`         | El plan nutricional vigente: el **día tipo**         |
| `/mi-semana`       | El plan semanal asignado: **qué come cada día**      |
| `/mi-diario`       | Lo que registra: comidas, peso, agua, sueño          |
| `/mi-progreso`     | Su evolución (`SeccionTracking`)                     |
| `/mi-composicion`  | Antropometría, en lectura                            |
| `/mis-objetivos`   | Objetivos y estrategias, en lectura                  |
| `/mis-recetas`     | Recetas que le asignaron                             |
| `/mi-material`     | Material de la biblioteca                            |
| `/mis-turnos`      | Sus turnos                                           |
| `/mensajes`        | El hilo con su nutricionista                         |
| `/asistente`       | El asistente de IA                                   |
| `/mi-perfil`       | Su foto y su contraseña (`docs/PERFIL.md`)           |

Todas leen procedimientos «míos» (`miPlan`, `miDia`, `miTracking`,
`obtenerMiPlanSemanal`…), que toman el paciente de la sesión con
`pacienteDeSesion`. Ninguna recibe un `pacienteId`: donde no hay nada que
elegir, no hay forma de pedir los datos de otro.

## El inicio responde una sola pregunta: qué me toca ahora

`/mi-inicio` no es un tablero de indicadores. El paciente entra a saber qué
comer y a registrar lo del día, así que el orden de la pantalla es ese:

1. **Encabezado** — la fecha, el saludo y el próximo turno. El turno está acá,
   en una línea, y ya no en una tarjeta propia: es un dato que se mira de
   reojo, y una card entera lo ponía al mismo nivel que el plan del día.
2. **Accesos rápidos** — ocho baldosas a los destinos del portal. Cada una
   lleva **su** color, siempre el mismo: en una grilla de ocho baldosas
   idénticas hay que leer las ocho etiquetas para encontrar una, y esto se abre
   todos los días para ir casi siempre al mismo lado. El color acompaña al
   ícono y a la etiqueta, nunca los reemplaza. Mensajes lleva su contador.
3. **Qué comer** — dos tarjetas: la franja del **plan** que corresponde a esta
   hora, y las comidas de hoy del **menú semanal**. Son dos cosas distintas y
   un paciente puede tener las dos (ver `PLANES-SEMANALES.md`).
4. **Registro rápido** — peso y agua, sin salir del inicio. El agua se cuenta
   en **vasos de 250 ml** porque es como se toma; el total en ml va al lado,
   que es como lo lee el nutricionista. Los vasos dibujados son los que ya
   tomó: no hay meta de hidratación en el sistema, y poner un denominador
   inventado sería mostrarle un objetivo que nadie le fijó.
5. **Objetivos en curso**, si tiene.

## Las pantallas se reconocen antes de leerse

`EncabezadoPortal` es el mismo encabezado en todas —degradado, patrón de
puntos, ícono, título y una línea que dice para qué sirve la pantalla—. Su
valor está justamente en que sean idénticas: esto se abre todos los días y se
navega por reconocimiento, no leyendo. Con una copia por página, la quinta ya
tenía otro margen.

La excepción es `/asistente`: ahí el alto ES la función. El chat ocupa lo que
queda de la ventana, y un encabezado de 7rem se lo come sin dar nada a cambio;
lleva el mismo ícono en su cuadrado de color y nada más.

Adentro, las tarjetas repiten un patrón: **cabecera con fondo tenue y el ícono
en un cuadrado del mismo color**. El color agrupa —peso en rosa, hábitos en
verde, plan en violeta, agua en celeste— y el título es el que informa; el
color nunca va solo.

## «Mi plan» y «Mi semana» comparten los colores de las franjas

`comunes/paletaFranjas` la usan las dos: la grilla semanal (del consultorio y
del paciente) y el plan del día (`VistaPlan`, que también ve el profesional).
El color sale de la POSICIÓN de la franja, no de su nombre —son texto libre—,
así que el desayuno es siempre el primero y siempre del mismo tono.

Para el paciente, «Mi plan» y «Mi semana» son dos vistas de lo mismo: qué come.
Que el almuerzo cambiara de color entre una y otra rompe justamente lo único
que el color hace, que es ubicar la franja sin leer.

En el plan del día, además, las opciones de una franja avisan que son
**intercambiables** («Elegí una de las 3 opciones»). Sin decirlo, tres opciones
se leen como tres comidas: el mismo malentendido que evita el plan semanal al
sumar solo la principal de cada celda.

## Mi progreso abre con tres cifras

Antes la pantalla arrancaba con un gráfico. Las tres cifras del período
—variación de peso, días con registro y cumplimiento promedio— van arriba de
todo porque son lo que se mira primero y lo que el resto de la pantalla
desarrolla.

El cumplimiento promedia **solo los axiomas que se miden**: los informativos no
tienen porcentaje, y contarlos como cero hundiría el número por el solo hecho
de tener recomendaciones cargadas.

Al pie, «Datos del reloj» va marcada **En desarrollo**: el backend está entero
pero el plugin nativo que la llena todavía no, así que sin el aviso su vacío se
leería como un problema del paciente (ver `WEARABLES.md`).

## Mi diario: el mes contesta una pregunta

El calendario del diario tenía cuatro puntos de color por día y nada más. La
pregunta que se le hace a un calendario de hábitos es «¿cómo vengo este mes?»,
y contar cuadraditos a ojo no la contesta: arriba de la grilla va **cuántos de
los días transcurridos llevan registro**, con su barra.

«Transcurridos», no «del mes»: en el mes en curso se cuenta hasta hoy, porque
contra los 31 días completos un mes recién empezado se vería siempre en rojo.

Los cuatro indicadores (peso, agua, comidas, actividad) pasaron de puntos a
**íconos**: el color ubica de un vistazo qué falta, el ícono es lo que
realmente lo dice, y la leyenda los nombra. Un punto de color a secas obligaba
a memorizar cuál era cuál.

En la hoja del día, los escalares se guardan con un botón y todo lo demás se
guarda solo (una comida se agrega, una actividad se agrega). Esa mezcla es la
que hace fácil perder lo escrito, así que el botón **avisa cuándo hay algo sin
guardar** y se apaga cuando no: es el único lugar del portal donde escribir no
alcanza.

## La curva de peso muestra una fuente por vez

`SeccionTracking` es la misma pieza en el portal y en la ficha del profesional,
así que esto se ve en los dos lados.

El peso llega de dos fuentes —lo que el paciente carga en su diario y el de cada
medición de consulta— y el read-model del tracking ya las distinguía
(`PuntoPeso.fuente`). Primero se las pintaba iguales; después, dos series
superpuestas con color y trazo distintos. Ninguna de las dos alcanzó: la balanza
de casa a la mañana y la del consultorio a la tarde no miden lo mismo, y dos
curvas en el mismo eje se siguen leyendo como una sola nube de puntos donde un
escalón entre una serie y la otra parece progreso y es el cambio de balanza.

Ahora hay un **selector de fuente** en la tarjeta y se ve **una sola serie**. El
predeterminado es **En consulta**: es la que toma el profesional, siempre con la
misma balanza y el mismo procedimiento, y es sobre la que se decide. **En el
diario** está a un clic y sirve para la tendencia entre consultas, que es lo que
esa fuente sí contesta.

El filtro vive en `SeccionTracking`, no dentro de la tarjeta, porque la cifra
**Variación de peso** de arriba tiene que mirar la misma fuente: dos números de
peso distintos en la misma pantalla se leen como un error de la app. `filtrarPeso`
recorta los puntos y **recalcula** inicial, actual y variación con los que
quedan — una variación que arranca en la balanza de casa y termina en la del
consultorio no mide el paciente, mide la balanza.

Cada fuente conserva su color y su trazo —coral continuo el diario, azul
punteado y con puntos más grandes la consulta, los dos de la categórica ya
validada en `paletaGraficos`—, más la leyenda al pie que nombra la que se está
viendo. Cambiar de fuente se nota sin mirar el selector.

Ya no hace falta `connectNulls` ni agrupar los puntos por fecha: dentro de una
misma fuente hay como mucho un peso por día (`@@unique([pacienteId, fecha])` en
`registros_diarios` y en `antropometrias`), así que la serie es una fila por
punto y ninguna fecha se repite en el eje.

El vacío se explica por fuente («No hay mediciones de consulta en este
período»), porque con el filtro puesto un gráfico vacío no dice si falta el dato
o si está del otro lado del selector.

## El asistente guarda los chats

Igual que el del profesional, y en la misma tabla: el detalle de por qué, y de
qué separa un chat de otro, está en `ASISTENTE-IA.md`. Del lado de la pantalla,
la lista de chats se pliega en mobile y queda fija al costado de `lg` para
arriba: en un teléfono, una columna de títulos al lado del hilo deja los dos
ilegibles, y lo que se viene a hacer acá es escribir en el último.

## El reloj es el del paciente, no el del servidor

El saludo («buenos días»), qué día de la semana es hoy y qué franja del plan
corresponde a esta hora salen del reloj de quien mira. El servidor renderiza el
HTML inicial en SU zona horaria, así que calcular eso durante el render da un
árbol que no coincide con el del navegador y React descarta la hidratación
entera.

Por eso está `lib/hooks/useEsCliente`: `false` en el HTML del servidor y en la
hidratación, `true` a partir de ahí. Va con `useSyncExternalStore` y no con un
`useState` + `useEffect` porque es exactamente lo que hace —leer un valor que
difiere entre servidor y cliente— sin el render extra de escribir estado dentro
de un efecto.

Lo que se rinde solo cuando ya hay datos de una consulta tRPC no necesita el
hook: en el servidor esa rama no existe.

## Al tocar esto

- Una pantalla nueva del portal va bajo `/mi-` o `/mis-`: son los prefijos que
  el middleware exige sesión (`auth.config.ts`).
- El procedimiento que la alimenta se escribe con `pacienteDeSesion`, no con un
  `pacienteId` opcional.
- Todo se diseña primero para 375 px de ancho. Lo que solo entra en una
  pantalla grande se ofrece de `lg` para arriba y nada más, como el cambio a la
  grilla completa en `/mi-semana`.
