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
- **Nunca hacer que el login distinga "contraseña incorrecta" de "ese email no
  existe"**: es un enumerador de cuentas.
- **Nunca importar Prisma en `src/servidor` para testear la traducción**: el
  traductor se dobla con `vi.mock` y el mapeo real se prueba en
  `infraestructura/persistencia/erroresPrisma.test.ts`, que es donde Prisma sí
  puede entrar.
