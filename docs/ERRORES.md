# Qué error ve el usuario, y por qué

Un mensaje de error sirve si responde dos cosas: **qué pasó** y **qué puedo
hacer**. «Ocurrió un error inesperado. Volvé a intentarlo en unos minutos.» no
responde ninguna de las dos, y encima miente: si el email estaba repetido, ni
era inesperado ni reintentar iba a cambiar nada.

## Los dos bordes

Hay dos puertas de salida y tienen que decir lo MISMO ante el mismo problema:

| Borde | Quién | Dónde |
| --- | --- | --- |
| tRPC | casi toda la app | `servidor/trpc.ts` (middleware único) |
| HTTP | los route handlers de `/api/*` | `servidor/errores-http.ts` |

Los route handlers **no pasan por el middleware de tRPC**, así que todo lo que
se agrega en uno hay que agregarlo en el otro. Si no, la misma equivocación
dice cosas distintas según si el usuario estaba subiendo un archivo o guardando
un formulario.

La traducción de cada código a cada transporte vive una sola vez, en
`servidor/mapaCodigos.ts`.

## La cadena, de adentro hacia afuera

1. **El caso de uso comprueba y lanza un error tipado.** Es el único lugar que
   sabe QUÉ se estaba haciendo, así que es el único que puede decir «ya tenés un
   paciente con ese email: Juan Pérez». Esto es lo que hay que escribir.
2. **El middleware traduce** `ErrorDominio` → código de transporte, conservando
   el mensaje.
3. **Si el error viene de la base** (`P2002` y compañía), `traducirErrorPrisma`
   lo convierte en algo legible. Es la RED, no el piso: que haga falta significa
   que en el paso 1 falta un chequeo, y por eso **también se reporta al
   monitor**.
4. **Cualquier otra cosa** sí es inesperada y sale con el mensaje genérico, que
   ahí es la respuesta correcta. El mensaje interno nunca viaja al navegador:
   trae nombres de tabla y a veces el host de la base.

## El caso que originó todo esto: el email repetido

`pacientes.email` es único POR CONSULTORIO, pero `usuarios.email` es único
**global** (la misma persona puede ser paciente de dos nutricionistas —son dos
fichas— pero tiene una sola cuenta).

El alta comprobaba el email con `usuarios.obtenerPorEmail`, que lleva el filtro
de inquilino y por lo tanto **no veía las cuentas de otros consultorios**. El
alta seguía, y el choque aparecía recién contra el índice de Postgres: un error
que no es de dominio, que caía en el genérico y que no decía lo único que hacía
falta saber —usá otro email—.

Ahora `CrearPaciente` hace **tres** preguntas distintas, porque lo que el
profesional tiene que hacer después no es lo mismo en los tres casos:

| Qué pasa | Qué se le dice |
| --- | --- |
| Ya es paciente de este consultorio | Lo nombra: «…: Juan Pérez. Editá su ficha» |
| El email es de otra cuenta de este consultorio | «Ya está usado por otra cuenta de este consultorio» |
| El email tiene cuenta en la plataforma | «Ya tiene una cuenta. Usá otro» |

El tercero usa `emailYaRegistrado`, que consulta **sin** filtro de inquilino y
devuelve un **booleano**. Es deliberado: lo único que cruza el límite entre
consultorios es un sí/no. Devolver la cuenta diría de quién es, y eso sí sería
una fuga.

## El login dice por qué falló, sin delatar cuentas

Antes todo salía como «Email o contraseña incorrectos», incluido el bloqueo por
intentos: el que se equivocaba cinco veces seguía probando contra una puerta que
ya no iba a abrirse, y su contraseña buena también fallaba.

Ahora se distinguen los motivos que **no revelan si la cuenta existe**
(`lib/autenticacion/codigosLogin.ts`):

- **Bloqueado por intentos** — lo dispara también el contador por IP, sin mirar
  ninguna cuenta.
- **Cuenta desactivada** — se informa **después** de verificar la contraseña.
  Quien la sabe ya sabe que la cuenta existe, así que decírselo no enumera nada,
  y es la diferencia entre «me equivoqué» y «me dieron de baja».

La contraseña incorrecta y el email inexistente siguen dando **el mismo**
mensaje. Distinguirlos permitiría averiguar qué emails están registrados.

El canal es el `code` de un `CredentialsSignin` propio: Auth.js no deja devolver
un mensaje desde `authorize`.

## La validación de Zod, dicha en castellano

El `message` de un `TRPCError` de validación de input **es el
`JSON.stringify` de los issues de Zod**. Eso viajaba tal cual al navegador y el
hook lo tiraba a un toast: al importar una planilla con once consultas, once
issues iguales producían un cartel de ochenta líneas
(`[{"code":"too_small","minimum":20,"type":"number",…}]`) que tapaba media
pantalla y no nombraba ni una vez la medida que había que corregir.

`servidor/mensajeZod.ts` lo traduce, y lo usan **los dos bordes**: el middleware
de tRPC y `errores-http.ts`. Tres decisiones dan forma al mensaje:

- **Se agrupa por campo, no por issue.** Once mediciones con el mismo perímetro
  fuera de rango son UN problema repetido once veces.
- **Se nombra el campo como lo ve el usuario** (`circPantorrilla` → «Perímetro
  de pantorrilla», vía `ETIQUETAS_CAMPO_PLANTILLA`). El nombre de la columna no
  está escrito en ninguna pantalla.
- **Se corta en tres campos** y el resto se cuenta. Un mensaje que no entra en
  un toast no se lee.

El resultado del caso de arriba es una línea:
«Perímetro de pantorrilla» tiene que ser 20 o más (en 11 mediciones).

El `cause` se conserva: es lo que lee el `errorFormatter` para mandar
`zodError` al cliente, que es con lo que los formularios marcan cada campo.

### Un mensaje escrito por nosotros gana

`.min(1, "No hay mediciones para importar")` ya dice lo que hay que decir. El
traductor solo reemplaza los mensajes **por defecto de Zod**, que son los que
están en inglés; los reconoce por cómo arrancan.

## El rango del lote lo aplica el DOMINIO, no el esquema

El caso que originó lo anterior tenía un segundo problema, más grave que el
mensaje: `ImportarMediciones` está escrito para **no ser todo-o-nada** —una
medida fuera de rango se informa como RECHAZADA y las demás entran—, pero eso
nunca se ejecutaba. Zod validaba el input ANTES, y un solo perímetro mal leído
por la IA tiraba abajo las once mediciones de la planilla.

La regla que salió de ahí: **el esquema de un LOTE no repite los rangos de la
entidad**. En `evaluacion.dto.ts` hay dos formas de acotar una medida
(`FormaDeAcotar`): `ACOTADA` para la carga de UNA medición, donde el rango en el
esquema es lo que frena al formulario, y `LIBRE` para el lote, donde el rango lo
aplica `Antropometria.crear` fila por fila. Lo que el esquema del lote sigue
exigiendo es lo que hace a la IDENTIDAD de una medición: fecha y peso.

Los mensajes de la entidad también nombran la medida como se la ve
(«Pliegue tricipital debe estar entre 1 y 80 mm»), porque son los que aparecen
en el resumen de la importación.

## «Alguien más la editó»: el error que evita perder datos en silencio

`ErrorEdicionConcurrente` es distinto de todos los demás de esta lista: no
señala un dato mal cargado, señala que **el guardado no entró** para proteger
lo que otro acababa de escribir.

El caso: dos personas abren la misma ficha. Una guarda el teléfono; la otra
guarda una nota, y el formulario manda TODOS sus campos, incluido el teléfono
viejo que tenía en pantalla. Sin guardia, el teléfono vuelve atrás, nadie ve un
error y el dato perdido solo aparece si alguien lo va a buscar.

La guardia es un bloqueo optimista sobre `actualizadoEn`, que ya existe en 43
tablas y por eso no hizo falta migración. El formulario manda la versión que
leyó y la condición viaja hasta el `where` del UPDATE
(`base/edicionConcurrente.ts`): si la fila se movió, Postgres no actualiza
nada, Prisma devuelve `P2025` y ahí se traduce.

Tres decisiones que conviene no deshacer:

- **La condición va en el UPDATE, no en un `if` previo.** Comparar antes de
  escribir deja una ventana entre la comparación y la escritura; el motor es el
  único punto donde no la hay. Es el mismo criterio que el EXCLUDE de los
  turnos.
- **Solo se traduce el `P2025` cuando HAY testigo.** Sin bloqueo optimista ese
  código significa lo que dice —la fila no está— y lo resuelve
  `traducirErrorPrisma` con su propio mensaje. Convertirlo siempre en conflicto
  de edición mandaría a recargar por algo que se borró.
- **El mensaje dice que los cambios NO se guardaron.** Es la mitad del dato: el
  usuario los tiene en pantalla y necesita saber que no entraron antes de
  cerrar el diálogo. No se fusiona por nuestra cuenta — sería elegir cuál de
  los dos profesionales tenía razón.

Hoy lo llevan **paciente** y **receta**, que son los formularios que escriben
el registro entero. Las mutaciones de un solo campo (archivar, marcar la
bienvenida, cambiar el estado de un turno) van sin testigo a propósito: no
salen de un formulario, no tienen de dónde sacarlo, y pisan únicamente lo suyo.

## El toast: lo que el usuario ve

`lib/errores.ts` es el único lugar por donde un error se convierte en un toast
(`avisarError`). Antes cada hook hacía `toast.error(error.message)`, y eso
confía en que el `message` sea presentable, cosa que no siempre es cierta: un
`fetch` suelto, una librería o un error de red del navegador traen lo que
traen. Dos reglas:

- **Nunca un volcado.** Lo que parece JSON o rastro de pila se reemplaza por un
  mensaje genérico: no dice nada que el usuario pueda usar y tapa la pantalla.
- **Nunca más largo que un toast** (220 caracteres). El detalle completo ya está
  en el monitor del servidor.

Dura 7 segundos y no 4 como el resto: un error hay que alcanzar a leerlo y, a
diferencia de un «guardado», no se deduce de lo que quedó en pantalla.

## Los formularios: el error que no se ve

El peor error es el que no aparece. `handleSubmit` de react-hook-form **no llama
al envío** si el esquema rechaza algo, y si ese algo es un campo que el
formulario no dibuja, no hay ningún `<FormMessage>` donde aparezca el motivo: el
botón queda mudo, sin nada en la consola ni en la red.

Pasó en el alta desde documento, que comparte esquema con el alta normal y en
ese momento no dibujaba el selector de sede (hoy sí lo dibuja, pero el campo
sigue siendo opcional en el esquema: la regla vale igual para el próximo campo
que se agregue). Dos reglas que salieron de ahí:

- **Un campo que algún consumidor no dibuja no puede ser obligatorio en el
  esquema compartido.**
- **Un formulario con campos condicionales lleva `onInvalid`** en
  `handleSubmit`, que muestra qué campo falló y por qué.

## Lo que NO hacer

- **Nunca dejar que un choque contra una restricción de la base sea el chequeo.**
  La red lo hace legible, pero solo el caso de uso puede decir con QUÉ chocó.
- **Nunca apagar el monitor al traducir un error de la base.** Que haya llegado
  hasta Postgres es la señal de que falta una validación; sin el reporte, la
  deuda se vuelve invisible.
- **Nunca dejar pasar el mensaje crudo de Prisma o del driver al navegador**:
  trae nombres de tabla, de columna y a veces el host y el puerto de la base.
- **Nunca agregar un caso al middleware de tRPC sin agregarlo a
  `errores-http.ts`**, y al revés.
- **Nunca dejar que el `message` de un `ZodError` llegue al usuario**: es el
  volcado de los issues, no una frase.
- **Nunca repetir en el esquema de un LOTE los rangos que ya valida la
  entidad**: convierte en todo-o-nada una importación que está escrita para
  resolver fila por fila.
- **Nunca hacer que el login distinga "contraseña incorrecta" de "ese email no
  existe"**: es un enumerador de cuentas.
- **Nunca importar Prisma en `src/servidor` para testear la traducción**: el
  traductor se dobla con `vi.mock` y el mapeo real se prueba en
  `infraestructura/persistencia/erroresPrisma.test.ts`, que es donde Prisma sí
  puede entrar.
