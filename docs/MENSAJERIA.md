# Mensajería

Las conversaciones con el paciente, por los dos canales, y por qué la pantalla
está armada así.

## Dos transportes, una sola conversación

Hay dos canales: el **chat interno** del portal (`mensajeria`, tablas propias) y
**WhatsApp** por la Cloud API (`whatsapp`, ver `WHATSAPP.md`). Por debajo no
comparten nada —transporte, tablas, límites y hasta la ventana de 24 h de Meta
son distintos—, pero desde la cabeza del profesional son la misma pregunta:
«¿qué hablé con este paciente?». Por eso conviven en la misma pantalla, en un
selector de canal, y no en dos módulos del menú.

Dónde aparece cada uno:

| Pantalla                        | Qué muestra                                  |
| ------------------------------- | -------------------------------------------- |
| `/dashboard/mensajes`           | La bandeja completa: lista + hilo, dos canales |
| Ficha del paciente → Mensajes   | Los dos hilos de ESE paciente (`MensajesDePaciente`) |
| `/mensajes` (portal)            | El chat del paciente con su nutricionista     |
| Inicio → «Mensajes sin leer»    | Los que esperan respuesta (`MensajesSinLeer`) |

## Las piezas compartidas

`componentes/mensajeria/` tiene dos piezas que usan los dos hilos. Estaban
duplicadas y se habían ido separando solas —uno arrancaba con una línea de
textarea y el otro con dos, uno se deshabilitaba y el otro no—, que es
exactamente lo que hace que cambiar de pestaña obligue a reaprender la pantalla:

- **`chat.ts`** — los rótulos de fecha y el agrupado por día.
- **`Compositor.tsx`** — la caja de escribir.

### Las fechas del chat van en el huso de quien mira

Todas las fechas de mensajería son **instantes** (`creadoEn`,
`ultimoMensajeEn`), no columnas `DATE`. Se formatean sin `timeZone: "UTC"`: lo
que se quiere leer es la hora del reloj de la pared. Es la misma distinción que
separa `formatearFecha` de `formatearFechaHora` en `lib/formato`, y el motivo de
que `chat.ts` no reutilice ninguna de las dos: un chat necesita otra cosa —la
hora sola dentro del día y un rótulo relativo entre días—.

Dos cosas que `Intl` no da gratis y están resueltas a mano, con test:

- **`hour12: false` explícito.** Sin eso, `es-AR` devuelve `"09:05 a. m."`: tres
  caracteres de más al pie de cada burbuja, en un país de reloj de 24 h.
- **dd/mm a mano.** Con solo `day` y `month` en `"2-digit"`, ICU arma el patrón
  desde un esqueleto sin año e ignora el ancho pedido: devuelve `"15/1"`. En una
  columna de fechas alineadas ese ancho variable se nota.

### El separador de día usa la clave LOCAL

`agruparPorDia` parte el hilo por día usando una clave `YYYY-MM-DD` armada con
los getters locales, **no** con `aFechaISO` (que es UTC). Con la clave UTC, un
mensaje de las 22 h en Argentina cae en el día siguiente y abre un separador de
más en medio de la conversación.

`etiquetaDia` compara **días enteros**, no milisegundos: restando instantes,
cualquier mensaje de más de 24 h de antigüedad caería en «Ayer» aunque sea de
esta mañana.

## El hilo: días, rachas y acuse

Antes cada burbuja llevaba su hora y nada más, así que una conversación de tres
semanas se leía como si todo hubiera pasado hoy y un «mañana te confirmo» no se
podía ubicar en el tiempo. Ahora el hilo tiene tres cosas:

1. **Separadores de día** («Hoy», «Ayer», la fecha escrita), **pegajosos** arriba
   del scroll: la pregunta «¿de cuándo es esto?» aparece en el medio del día, no
   cuando se cruza su encabezado.
2. **Rachas.** Tres mensajes seguidos del mismo autor repetían burbuja con cola y
   hora tres veces. La racha se dibuja como un bloque: la cola y la hora van solo
   en el último, y adentro las burbujas casi se tocan. Una racha nunca cruza un
   separador de día, porque ahí ya cambió el contexto.
3. **Acuse de lectura.** `leidoEn` ya venía en el DTO y no se mostraba: quien
   escribía no sabía si del otro lado lo habían abierto. Un tilde enviado, dos
   tildes leído — los mismos que ya usaba el hilo de WhatsApp para `estado`.

El divisor **«Mensajes nuevos»** se fija una sola vez al abrir, antes de marcar
los mensajes como leídos: si dependiera de `leidoEn`, desaparecería justo cuando
sirve.

### El autoscroll no interrumpe

Al abrir, el hilo salta al fondo **sin animación**: el `scrollIntoView` suave
desde arriba de todo era un barrido por meses de conversación. Después solo sigue
al último mensaje si quien mira ya estaba cerca del fondo (`MARGEN_FONDO`). Si
está leyendo algo viejo, un mensaje nuevo ya no le arranca la pantalla.

### El compositor crece y no pierde lo escrito

El textarea se auto-ajusta al contenido hasta un tope y después scrollea: con
alto fijo, escribir un párrafo dejaba el principio del mensaje fuera de vista
justo cuando hace falta releerlo antes de mandarlo.

El borrador se limpia **apenas se manda** —escribir el siguiente no espera al
servidor— y se **repone si el envío falla**: `onEnviar` puede devolver una
promesa, y el `Compositor` la escucha. Es lo que salva el caso de WhatsApp fuera
de la ventana de 24 h, donde Meta rechaza el texto libre y perder lo escrito es
perder el mensaje entero. Por eso los llamadores pasan `mutateAsync` y no
`mutate`; el error lo avisa el toast del hook, como siempre.

El contador de caracteres solo aparece cerca del tope de 4000 (el mismo que
valida `mensajeria.dto`): mostrarlo desde el carácter uno es ruido.

## La bandeja del profesional

La lista de conversaciones tenía nombre, un recorte del último mensaje y una
fecha `dd/mm`. Con veinte pacientes eso es una lista para leer entera. Lo que se
agregó:

- **Buscador**, por nombre **y por el texto del último mensaje**: muchas veces se
  vuelve a una conversación por lo que se dijo («el análisis de sangre») y no por
  quién lo dijo.
- **Iniciales en un círculo**, teñidas cuando hay sin leer. Una columna de filas
  de texto idénticas no deja reconocer una conversación de un vistazo.
- **Rótulo relativo** en vez de `dd/mm` siempre: la hora si fue hoy, «Ayer», el
  día de la semana dentro de la última semana. Con `dd/mm` había que hacer la
  cuenta para saber si el paciente escribió recién o el mes pasado, que es justo
  lo que se mira al ordenar la bandeja. (De paso, la fecha se formateaba con
  `formatearFecha`, que es **UTC** y estaba corriendo un día los mensajes de la
  noche.)
- **Jerarquía por no leídos**: nombre en negrita, texto del último mensaje en
  color de primer plano y la hora en el color de acento.
- **La conversación activa se marca con una barra a la izquierda**, no solo con
  fondo gris: el fondo a secas se confundía con el hover de cualquier otra fila.

En el encabezado del hilo hay **«Ver ficha»**: la conversación casi siempre lleva
a mirar algo del paciente (el plan, la última medición) y antes había que volver
a Pacientes y buscarlo de nuevo.

La tarjeta **«Mensajes sin leer»** del inicio ahora enlaza a
`/dashboard/mensajes?paciente=…`, el deep-link que la bandeja ya sabía abrir. El
motivo del clic es **esa** conversación; mandaba a la bandeja vacía.
