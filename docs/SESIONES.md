# Sesiones: la de 12 horas y la que dura un mes

Conviven **dos credenciales** y hacen cosas distintas. Confundirlas es el error
que vuelve a aparecer cada vez que alguien toca esta parte, así que va primero:

| | **Sesión** (JWT) | **Refresco** (sesión persistente) |
| --- | --- | --- |
| Dónde vive | Cookie de Auth.js, firmada | Cookie httpOnly + fila en `tokens_refresco` |
| Cuánto dura | 12 h (`session.maxAge`) | 30 días (`SESION_PERSISTENTE_DIAS`) |
| Para qué sirve | Probar quién sos en cada request | Emitir una sesión nueva sin la contraseña |
| ¿Se puede revocar? | **No** | **Sí**, está en la base |
| Se usa | En todas las requests | Una vez cada 12 h, como mucho |

La de 12 h **no se tocó** al agregar la otra, y no hay que alargarla. Es corta
justamente porque no se puede revocar (el razonamiento completo está en
`auth.config.ts`): mientras el token no venza, vale. El refresco resuelve la
comodidad sin resignar eso, porque es la credencial larga la que ahora sí vive
en la base y se puede dar de baja.

## El problema que resuelve

Con solo el JWT, cualquiera que no entrara en 12 h volvía a la pantalla de
login. Para el consultorio eso era un lunes a la mañana; para un paciente que
abre la app cada tanto, prácticamente siempre. Y el que tipea su contraseña
todos los días termina eligiendo una que se pueda tipear todos los días.

## Cómo funciona

### Al entrar con contraseña

`authorize` del provider de credenciales, después de verificar el hash, llama a
`abrirSesionPersistente`: se emite un token de 256 bits, se guarda **solo su
SHA-256** y el valor en claro va a la cookie. Es el único momento en que se
probó la contraseña, así que es cuando corresponde entregar la credencial que
evita volver a pedirla.

Si esto falla, **el login no falla**: la persona ya entró y lo único que pierde
es la comodidad.

### Al volver después de 12 h

1. Pide `/dashboard`. El middleware no ve sesión, pero **sí ve la cookie de
   refresco**, así que en vez de mandarla al login la desvía a
   `/api/autenticacion/renovar?destino=/dashboard`.
2. El handler (runtime Node) llama a `signIn("refresco")`. El provider valida el
   token contra la base, **lo rota** y devuelve quién es.
3. Auth.js emite el JWT nuevo; el handler devuelve a la persona a `/dashboard`.

Desde afuera es una redirección de más. Nadie ve una pantalla de login.

El middleware solo mira que la cookie **exista**: corre en el Edge Runtime,
donde no hay Prisma ni `node:crypto`. Validar es trabajo del handler.

`/login` hace lo mismo por su cuenta, porque no es una ruta protegida y es a
donde llega quien la tiene en favoritos.

### Por qué pasa por `signIn` y no firma el JWT a mano

Porque emitir la sesión es exactamente lo que Auth.js ya hace al iniciar
sesión: firmar con `AUTH_SECRET`, elegir el nombre de cookie según el esquema,
pasar por los callbacks `jwt` y `session` que llenan rol, paciente e inquilino.
Una copia de todo eso se desincroniza en la primera actualización de la
librería, y el modo de fallar sería una sesión que parece válida y no lo es.

## Rotación y detección de robo

Cada canje **consume** el token y emite otro: uno robado sirve una sola vez.

Pero rotar solo no permite **detectar** el robo: si el ladrón canjea primero, la
víctima llega después con un token ya usado y no hay forma de saber cuál de los
dos era el legítimo. Por eso todos los tokens que descienden de un mismo login
comparten una **familia**: cuando aparece uno ya consumido, **cae la familia
entera**. Sea quien sea el ladrón, los dos quedan afuera y el dueño vuelve a
entrar con su contraseña.

### La ventana de gracia (30 s)

Dos pestañas abiertas después de un fin de semana presentan la misma cookie casi
al mismo tiempo: la primera la canjea, la segunda llega con un token que ya
figura usado. Sin una ventana de gracia eso se leería como robo y echaría a
alguien de todos sus dispositivos **por haber abierto dos pestañas**.

Dentro de esos 30 s la renovación se **concede** (se emite otro token de la
misma familia) en vez de rechazarse: rechazar dejaría una pestaña en el login
mientras la otra anda. Pasada la ventana, la detección salta igual — que es el
caso real, porque un token robado se explota cuando se puede y no justo cuando
la víctima está navegando.

El `usadoEn` del token **no se pisa** en los reintentos: hacerlo correría la
ventana hacia adelante en cada uno y la volvería indefinida.

## Qué cierra una sesión persistente

| Qué pasa | Alcance |
| --- | --- |
| "Cerrar sesión" | Solo **este** dispositivo (la familia de esta cookie) |
| Cambiar la contraseña desde el perfil | **Todos** los dispositivos |
| Restablecerla por email | **Todos** los dispositivos |
| Reutilización detectada | Toda la familia |
| Cuenta desactivada o borrada | Todos (la FK es `CASCADE`) |

Los dos caminos de contraseña echan a todo el mundo a propósito: quien la cambia
porque sospecha que le entraron a la cuenta no gana nada si el token de refresco
del otro —que no depende de la contraseña— le sigue abriendo la puerta durante
semanas. Que el propio dispositivo tenga que volver a entrar es el costo, y es
lo que ya espera cualquiera que cambió una contraseña en otro lado.

El cierre de sesión cuelga de `events.signOut` de Auth.js. Sin eso, el botón
borraría el JWT y dejaría viva la cookie de refresco: la siguiente navegación la
canjearía por una sesión nueva y la persona volvería a estar adentro sin haber
tipeado nada.

## La cookie

`__Host-sesion.refresco` en producción, `sesion.refresco` en desarrollo. El
prefijo `__Host-` impide que un subdominio la escriba, pero el navegador solo lo
acepta con `secure`, `path=/` y sin `domain`; en desarrollo (HTTP) esas
condiciones no se cumplen y la cookie se descartaría **en silencio**.

`httpOnly` para que ningún script la lea (es la defensa contra un XSS que se
llevaría semanas de sesión) y `sameSite=lax`, no `strict`: con `strict`, la
navegación de primer nivel desde un favorito llegaría sin cookie, que es
exactamente el caso que esto viene a cubrir.

El nombre y las opciones viven en `lib/autenticacion/cookieRefresco.ts` y en
ningún otro lado: los escriben tres capas distintas, y con que una quede
distinta la cookie se escribe en un lugar y se lee en otro. El síntoma sería el
peor posible —nadie renueva nunca, sin ningún error en el log—.

Ese archivo **tiene que seguir siendo compatible con el Edge Runtime**: lo
importa `auth.config.ts`, que importa `proxy.ts`. Nada de `node:crypto`, Prisma
ni el contenedor ahí adentro.

## Móvil y PWA

No hay nada especial que hacer. La app de Capacitor es un WebView contra el
mismo origen por HTTPS (`docs/MOBILE.md`), así que la cookie funciona igual que
en el navegador; y el service worker no cachea páginas ni `/api/*`
(`docs/PWA.md`), así que no hay respuestas viejas que interfieran con la
redirección.

## El consultorio activo del paciente

Un paciente puede atenderse en varios consultorios con la misma cuenta
(migración 78). La sesión lleva el consultorio ACTIVO en `pacienteId` y
`nutricionistaId`, y los tres momentos que emiten una sesión —login,
renovación y cambio de consultorio— lo deciden con `ResolverConsultorioActivo`
y la cookie `consultorio` del dispositivo. La renovación toma las fichas de
HOY: una ficha borrada no sigue abierta por 30 días. `sesionSigueVigente`
valida al paciente contra sus fichas, no contra la cuenta. Ver
`docs/CUENTAS-PACIENTE.md`.

## Lo que NO hay que hacer

- **Nunca alargar `session.maxAge` "ya que estamos".** Es el JWT, no se puede
  revocar, y alargarlo devuelve el problema que el refresco vino a evitar.
- **Nunca guardar el token de refresco en claro.** Va el SHA-256, como en
  `tokens_recuperacion`.
- **Nunca sumar `TokenRefresco` a `MODELOS_INQUILINO`.** No tiene
  `nutricionistaId`: se referencia por `usuarioId`, los usuarios son globales y
  el flujo corre con alcance global, igual que el login. `modelosInquilino.test.ts`
  lo verifica contra el schema.
- **Nunca renovar sin revalidar al usuario contra la base.** Una cuenta dada de
  baja no puede resucitar su sesión con un token viejo, y el JWT que se emita
  tiene que llevar el rol e inquilino de hoy, no los del login original.
- **Nunca tratar la reutilización como "token inválido" a secas.** Revocar solo
  el token presentado deja al ladrón con el que ya rotó. Cae la familia.
- **Nunca quitar el corta-bucles de `/login`.** Esa página y el handler se
  mandan al otro; la marca `?expirada=1` es lo que garantiza que eso termine
  aunque la cookie no se haya podido borrar.
- **Nunca usar el `destino` de la query sin validarlo.** Solo rutas internas: si
  no, `/api/autenticacion/renovar?destino=https://otro-sitio` es un redirector
  abierto que además entrega gente recién autenticada.
