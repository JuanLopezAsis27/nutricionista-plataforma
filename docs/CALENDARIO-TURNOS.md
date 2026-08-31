# Calendario de turnos

La pantalla `/dashboard/turnos`, vista **Calendario**: el mes en chico al
costado y el detalle de 7 días con sus horas.

## El problema que resuelve

La vista anterior era una grilla mensual. Cada día era una casilla de alto fijo
y cada turno, una línea de texto adentro (`09:30 Juan Pérez`); clickear el día
abría un diálogo con la lista de turnos de esa jornada.

Lo que ese formato no muestra es justamente lo que se le pregunta a una agenda:

- **Cuándo, dentro del día.** Dos turnos a las 09:00 y a las 18:00 se veían
  como dos renglones pegados. Los huecos de la jornada —el dato con el que se
  decide dónde entra un paciente nuevo— no existían en pantalla.
- **Cuánto dura.** `duracionMinutos` no se dibujaba en ninguna parte. Una
  consulta de 90 minutos y una de 15 ocupaban el mismo renglón.
- Con más de tres turnos, la casilla hacía scroll interno y el resto quedaba
  escondido sin ningún indicio.

Y el detalle de un turno exigía dos clicks y un diálogo modal que tapaba el
calendario entero: para comparar dos turnos había que abrir, leer, cerrar y
volver a abrir.

## Cómo está armado

```
CalendarioTurnos          ← ancla de la ventana, mes del mini calendario, reloj
├── MiniMes               ← el mes completo; mueve la ventana
└── GrillaSemanal         ← columnas de día × filas de hora
    └── ColumnaDia
        ├── franjas       ← huecos clickeables (lib/agenda.franjasDelDia)
        ├── bloques       ← los turnos, ubicados por lib/calendarioSemanal
        │   └── Popover → DetalleTurno
        └── línea de "ahora"
```

La geometría vive en `src/lib/calendarioSemanal.ts`, fuera de los componentes:
es lo único de la pantalla que se puede probar sin montar nada
(`calendarioSemanal.test.ts`).

### La ventana es de 7 días rodantes, no una semana calendario

Arranca en el día anclado —hoy, por defecto— y sigue seis días más. La pregunta
del profesional es «qué viene ahora»: un viernes a la tarde, una semana
calendario mostraría dos días útiles y el resto vacío hacia atrás.

Navegación con dos velocidades, a propósito:

- las flechas de arriba corren la ventana de a 7 días;
- el mini mes salta a cualquier día —de este mes o de otro— y lo pone como
  primer día del detalle. El punto debajo del número dice qué días tienen
  turnos, así que el salto no es a ciegas.

### La escala

`PX_POR_HORA` (56 px) es la única constante de escala: la posición de un turno,
su alto y la línea de «ahora» se derivan de ella. Un turno de 30 minutos mide
exactamente la mitad que uno de una hora, así que la lectura visual no puede
mentir sobre la duración.

El rango de horas **arranca en el horario de atención y se estira** para que
entre cualquier turno que caiga afuera. Los hay: uno cargado antes de acotar el
horario, o una consulta que se pasa del cierre. Recortarlos los haría
desaparecer de la pantalla sin ningún aviso, que es la peor forma de perder un
turno.

### Turnos que se pisan

`repartirCarriles` agrupa los turnos de un día en cadenas de solapamiento y les
reparte el ancho de la columna. No debería haber cruces —el dominio los
impide—, pero un turno CANCELADO libera el horario y **sigue mostrándose**: en
la grilla el cruce es normal, no una anomalía.

Dos detalles del reparto que se rompen callados:

- el ancho lo fija el momento más poblado de **todo el grupo**, no el de cada
  turno: si no, dos turnos encadenados por un tercero largo se dibujarían con
  anchos distintos y desalineados;
- un carril que dejó libre un turno ya terminado **se reutiliza**. Sin eso, un
  turno largo que abraza a cuatro cortos abriría cinco columnas de 20 % de
  ancho cada una.

### Los huecos libres salen de la misma función que el formulario

Las franjas clickeables son las que devuelve `franjasDelDia`
(`src/lib/agenda.ts`), el espejo en pantalla de la regla del dominio —ver
[AGENDA.md](AGENDA.md)—. No es duplicación: es que la grilla ofrezca
exactamente los huecos que el servidor va a aceptar.

Salen de ahí y no de una rejilla propia cada `turnoPasoMinutos` desde el borde
de la grilla porque **el horario de atención no tiene por qué arrancar en hora
en punto**: con apertura 08:15 y paso 30, una rejilla propia caería siempre
entre franjas y no habría un solo hueco clickeable.

Clickear un hueco abre el alta con ese día y esa hora ya elegidos. `horaInicial`
es una **preferencia, no una imposición**: si para cuando el diálogo termina de
cargar la franja dejó de estar libre, el formulario la reubica en la primera
disponible, igual que si se la hubiera elegido a mano.

### El globo de detalle

Clickear un turno abre su ficha en un `Popover` anclado al bloque —cerca de
donde se hizo el click, como en Google Calendar—. El calendario queda visible
detrás: se puede abrir un turno, leerlo, cerrarlo y abrir otro sin perder de
vista la semana.

**Todo se resuelve adentro del globo** (`DetalleTurno`): las transiciones de
estado son botones en vez de un desplegable, el borrado confirma en dos pasos
en el mismo lugar y el cobro se edita en línea. La razón es de comportamiento,
no estética: cada desplegable, diálogo o popover anidado es una superficie
flotante aparte, y al abrirla el navegador la cuenta como un click «afuera» del
globo, que se cierra.

La única acción que sale del globo es **reprogramar**: necesita la grilla de
franjas libres del día completo y no entra. El globo se cierra y el diálogo lo
abre la pantalla.

### La línea de «ahora»

Se lee con `useSyncExternalStore` y no con un estado que un efecto rellena al
montar: el reloj es un sistema externo a React. La instantánea del servidor es
`null` —y por eso la línea no aparece en el HTML inicial—, porque la hora del
servidor y la del navegador no tienen por qué coincidir y la línea quedaría
pintada en otro lugar del que le corresponde.

Se consulta cada 15 s y no cada 60: un intervalo de un minuto no está alineado
con el cambio de minuto del reloj y la línea llegaría a atrasarse casi un
minuto entero. React solo vuelve a renderizar cuando el texto cambia, así que
el costo real sigue siendo un render por minuto.

## La vista de lista

Sigue existiendo, con la tabla, los filtros por estado y por fecha y las mismas
acciones. Es la que sirve para buscar («¿qué turnos tiene este estado?»),
mientras que el calendario sirve para mirar la agenda. El calendario es la
vista por defecto.

## Al tocar esto

- La geometría va en `src/lib/calendarioSemanal.ts`, con su test. Un turno mal
  ubicado no tira error: tapa a otro.
- Los huecos ofrecidos salen de `franjasDelDia`, nunca de una rejilla propia:
  ver arriba por qué.
- Los días de la semana se leen **en UTC** (`getUTCDay()`), como en todo el
  módulo de turnos: `Turno.fecha` es un `DATE` que llega como medianoche UTC.
- El globo no puede contener otra superficie flotante. Lo que necesite una,
  se abre desde la pantalla, como reprogramar.
