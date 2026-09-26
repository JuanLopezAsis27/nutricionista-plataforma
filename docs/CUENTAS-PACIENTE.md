# Cuentas de paciente: una persona, varios consultorios

Una persona puede atenderse con dos nutricionistas. Cada consultorio tiene su
propia **ficha**, pero la persona tiene **una sola cuenta**: con qué entra
(email, nombre de usuario o los dos), una contraseña y una foto. Desde la
migración 78, cada ficha dice de qué cuenta es.

Desde las migraciones 79 y 80 el email es **opcional**: hay pacientes sin email
(niños, personas mayores) que igual tienen su cuenta y entran con un nombre de
usuario, y la ficha y la cuenta ya no se asocian solas por el email. Ver
[Sin email: usuario e invitaciones](#sin-email-usuario-e-invitaciones).

## El modelo

```
usuarios (la persona / la cuenta) 1 ──── N pacientes (la ficha) N ──── 1 nutricionistas
```

| Tabla            | Qué es                                                  | ¿De un consultorio?                              |
| ---------------- | ------------------------------------------------------- | ------------------------------------------------ |
| `usuarios`       | La CUENTA: email y/o usuario, contraseña, rol, foto     | La del paciente, **no** (`nutricionistaId` NULL) |
| `pacientes`      | La ficha: la relación persona ↔ consultorio, con todo lo clínico colgando | Sí                  |
| `nutricionistas` | El consultorio                                          | Es el inquilino                                  |

**`pacientes` es la tabla intermedia del muchos a muchos** entre personas y
consultorios. No es liviana, y no puede serlo: el nombre como lo cargó cada
profesional, el teléfono, el archivado, la bienvenida y las 45+ tablas clínicas
son de la relación, no de la persona. Si vivieran en un «paciente global», un
consultorio leería y editaría los datos de otro. Por eso tampoco hay una tabla
«persona» aparte: no tendría ninguna columna que no sea de la ficha o de la
cuenta.

`pacientes.usuarioId` es NULL en la ficha sin portal. La identidad compartida
entre consultorios es SOLO la cuenta, y la une la persona canjeando un código
de invitación: unir fichas por nombre, teléfono, DNI o email le diría a un
consultorio que la persona se atiende en otro, y un dato mal cargado le
abriría una ficha a otra persona.

Antes, `usuarios` tenía `pacienteId` y el `nutricionistaId` del consultorio de
esa ficha. Así era imposible tener dos: `usuarios.email` es único global, y el
segundo consultorio recibía «ese email ya tiene una cuenta en la plataforma».
(Una primera versión de la migración usaba una tabla `accesos_portal` para el
vínculo; como cada ficha tiene como mucho una cuenta, alcanzaba con la columna,
y se reemplazó antes de aplicarla.)

Invariantes:

- `UNIQUE (nutricionistaId, usuarioId)` en `pacientes`: una ficha por
  consultorio y por cuenta.
- `pacientes.usuarioId` es `ON DELETE SET NULL`: dar de baja la cuenta deja la
  ficha clínica intacta, sin portal.
- CHECK `rol <> 'PACIENTE' OR nutricionistaId IS NULL`, y lo mismo en la
  entidad `Usuario`: si la cuenta de un paciente tuviera inquilino, la
  extensión de Prisma la escondería de los demás consultorios.
- La entidad `Paciente` no conoce `usuarioId`: lo escribe solo
  `ICuentaPacienteRepositorio.vincular` (`DarAccesoPortal` y el canje de una
  invitación), y el `update` de la ficha no lo toca.

### Cómo se lee una cuenta que no es de nadie

`usuarios` sigue siendo tabla de inquilino (la cuenta del profesional lo es, y
de ahí salen `listarPorRol("NUTRICIONISTA")` y la foto del profesional en el
chat). El filtro automático (`nutricionistaId = <consultorio>`) volvería
invisible la cuenta del paciente para todos, incluido el propio paciente dentro
de su sesión.

Por eso `PrismaRepositorioUsuario` escribe el filtro a mano (`visibles`): un
consultorio ve su propia cuenta y las de los pacientes dueños de alguna de
SUS fichas, y la consulta corre con alcance global para que la extensión no le
sume el suyo. Sigue siendo fail-closed: sin alcance fijado, lanza.

Hay una escritura global legítima: crear la cuenta de un paciente
(`crear` con `esPaciente`). La fila no es de ningún consultorio, así que no hay
inquilino que declarar; con alcance de inquilino, la extensión le pondría el
del consultorio que da el alta y el CHECK la rechazaría.

## La regla que importa: exclusividad

**Un consultorio solo administra la cuenta si es EXCLUSIVAMENTE suya**
(`dominio/servicios/cuentaPaciente.ts`, `esCuentaExclusiva`). Si el consultorio
B pudiera fijar la contraseña de una cuenta que también usa A, podría entrar
como el paciente y leer los datos clínicos de A. Con el email de inicio de
sesión pasa lo mismo: cambiarlo desde B se lo cambia en A.

| Operación                              | Cuenta exclusiva                                | Cuenta compartida                                                  |
| -------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------ |
| Bienvenida manual con `{{contrasena}}` | Genera o usa la manual y la asigna              | No toca la contraseña; sale la plantilla de cuenta existente       |
| Restablecer la contraseña (ficha)      | Genera o usa la manual y la muestra una vez     | No se puede: es de la persona                                      |
| Editar el email de la ficha            | Si la cuenta entraba con ese email, lo lleva    | Cambia la ficha; el login queda como está                          |
| Código de invitación                   | Sirve para juntarla con otra cuenta suya        | No se emite: mudarla le sacaría el acceso a alguien                |
| Eliminar la ficha                      | Borra la cuenta (con sus sesiones)              | Borra la ficha; la cuenta sigue para el otro                       |

(El alta ya no está en esta tabla: nunca vincula una cuenta existente. Ver la
sección de invitaciones.)

`ICuentaPacienteRepositorio.contarDeUsuario` devuelve un NÚMERO y no la lista a
propósito: quien pregunta desde un consultorio necesita saber si la cuenta es
solo suya, no con quién la comparte.

Una cuenta de profesional nunca se vincula como paciente: si el email de la
ficha es el de un profesional, `DarAccesoPortal` no lo usa como ingreso y pide
un nombre de usuario, sin decir de quién es.

## Contraseña provisional

`usuarios.passwordProvisional` marca la contraseña que eligió un PROFESIONAL:
la del alta de una cuenta nueva y la de la bienvenida manual
(`Usuario.fijarPasswordProvisional`). Cualquier cambio de la persona la limpia
(`cambiarPassword`: Mi perfil y la recuperación por email). El re-hasheo del
login no (`rehashearPassword`): es la misma contraseña con otro costo.

El portal muestra una **advertencia** (`AvisoContrasenaProvisional`, en el
layout, y una línea en Mi perfil) que recomienda cambiarla. **No obliga**: se
decidió así. La defensa real contra que un consultorio conozca la contraseña de
otro es la exclusividad; la advertencia cubre el caso restante (el consultorio
que creó la cuenta la conoce hasta que la persona la cambie, también después de
que otro consultorio la vincule).

La marca no viaja en el JWT: se lee de `perfil.mio`, así la advertencia se va
apenas se cambia la contraseña, sin reemitir la sesión. Las cuentas que ya
existían antes de la migración quedaron en `false`.

## La bienvenida de quien ya tenía cuenta

Plantilla de sistema aparte, `BIENVENIDA_CUENTA_EXISTENTE`, sin
`{{contrasena}}`: «X te sumó a su consultorio; entrás con tu email y la
contraseña que ya usás». Se siembra en cada consultorio (migración 78,
`ProvisionadorNutricionista` y el seed) y se edita en Configuración como las
demás. Desde la migración 80 sale **solo del envío manual**, cuando la cuenta
de la ficha no es exclusiva: el alta ya no vincula cuentas existentes, así que
en el alta no hay «ya tenía cuenta» sino un código de invitación (ver abajo).

## El consultorio activo

La sesión lleva el consultorio en el que se está trabajando: `pacienteId` y
`nutricionistaId` del JWT significan «la ficha y el inquilino ACTIVOS». Por eso
`conAlcanceDeSesion`, `pacienteDeSesion` y los routers del portal no cambiaron.

`ResolverConsultorioActivo` es el ÚNICO camino que decide cuál, y lo usan los
tres momentos que emiten una sesión: el login (`authorize`), la renovación con
el token de refresco y el cambio de consultorio (callback `jwt` con
`trigger === "update"`). Con una ficha, esa. Con varios, el que eligió la
persona en ese dispositivo si todavía es suyo; si no, ninguno.

**La elección se recuerda por dispositivo**, en la cookie httpOnly
`consultorio` (`lib/autenticacion/consultorioActivo.ts`), durante un año.
Nadie confía en ella: se revalida contra las fichas de la cuenta cada vez, porque puede
nombrar una ficha que se borró.

**Sin consultorio elegido**, el layout del portal manda a `/mis-consultorios`
(«Elegí tu consultorio», en el grupo `(auth)` para no quedar debajo del layout
que redirige). Esa sesión no tiene inquilino, así que cualquier consulta a una
tabla de inquilino falla cerrado.

**Cambiar** es `POST /api/autenticacion/consultorio` y no una mutación de tRPC,
porque toca cookies: valida que la ficha sea suya (`CambiarConsultorioActivo`, 403 si no es
suyo), guarda la cookie y reemite el JWT con `unstable_update`. El cliente
después hace `update()`, `router.refresh()` e invalida la caché.

**El payload de `update()` es solo una preferencia.** Cualquier script de la
página puede llamarlo con lo que quiera, así que el callback `jwt` nunca copia
los datos del cliente: vuelve a resolver la identidad desde la base, y
`ResolverConsultorioActivo` solo acepta una ficha que sea de ESA cuenta.

**Red de seguridad**: `sesionSigueVigente` valida al paciente contra sus
fichas (el par ficha/consultorio del token tiene que ser una de ellas), no
contra el `nutricionistaId` de la cuenta. Si le borran la ficha activa, la
sesión se corta en la request siguiente. El handler del cambio llama a
`olvidarSesion` para que una ficha recién vinculada no choque con el caché.

## En pantalla

- **Selector** (`SelectorConsultorio`): un ícono en el pie de la barra lateral
  del portal y en la barra móvil. Solo aparece con dos o más consultorios.
- **«Elegí tu consultorio»** (`EleccionConsultorio`): tarjetas con el nombre del
  profesional. La foto suele caer a las iniciales, porque la autorización de
  archivos mira el consultorio de la sesión y ahí todavía no hay ninguno.
- **Dashboard**: después del alta, el formulario muestra lo que hay que
  entregarle a la persona (`ResultadoAccesoPortal`): sus credenciales, o el
  código de invitación si ya tenía cuenta con otro profesional. La bienvenida
  manual avisa cuántas salieron sin contraseña por ser compartidas.
- **Ficha del paciente → «Portal»** (`AccesoPortalPaciente`): con qué entra,
  y darle acceso, restablecer la contraseña o emitir un código.
- **Portal → «Mis consultorios»**: cargar un código (`AgregarConsultorio`). Se
  llega desde el enlace del email (`?codigo=`), desde «Mi perfil» —con un solo
  consultorio el selector no se dibuja— y desde «Ver todos».
- **Tiempo real**: el canal SSE es de la cuenta, así que llegan eventos de los
  dos consultorios. `mensaje.nuevo` lleva el `pacienteId` de la ficha, y el
  portal no muestra el toast si no es del consultorio activo.
- **Recuperación de contraseña**: firma con el nombre del profesional si la
  cuenta tiene un solo consultorio; con varios va sin firma, porque la
  contraseña es de todos.

## Limitaciones conocidas

- **La foto de perfil del paciente** es un `Archivo` del consultorio donde la
  subió (la tabla `archivos` es de inquilino). Los otros consultorios no la ven y
  muestran las iniciales.
- **El canje no fusiona dos cuentas que tienen cada una fichas en varios
  consultorios**: solo muda una ficha cuya cuenta es exclusiva de su
  consultorio. Es el caso real (la cuenta de más la creó un solo profesional).
- **El email nuevo que se pone la persona en «Mi perfil» no se verifica**
  con un enlace: lo escribe quien acaba de probar su contraseña. Si lo escribe
  mal, sigue entrando con lo que tenía y lo corrige.

## Sin email: usuario e invitaciones

Migraciones 79 (`paciente_email_opcional`) y 80 (`usuario_e_invitaciones`).
Las dos solo aflojan restricciones o suman columnas vacías: ninguna fila que
existía puede incumplirlas.

### El email de la ficha es de CONTACTO

`pacientes.email` es opcional y **se puede repetir** (dejó de ser
`UNIQUE (nutricionistaId, email)`): dos hermanos pueden llevar el email de la
madre. Es a dónde le escribe el consultorio —bienvenida, recordatorios,
invitación del calendario—, no con qué se entra. Sin email, esos avisos se
saltean (ver `docs/RECORDATORIOS.md`); WhatsApp y el portal funcionan igual.

### La cuenta entra con email, usuario o los dos

`usuarios.email` es opcional y hay `usuarios.nombreUsuario` (único en toda la
plataforma, porque la cuenta es global). CHECK en la base: al menos uno de los
dos, y el profesional y el administrador siempre con email.

El nombre de usuario va en minúsculas y **sin arroba**
(`dominio/servicios/nombreUsuario.ts`, y un CHECK con la misma regla): así el
login sabe qué le escribieron —con `@` busca por email, sin `@` por usuario—.
El mensaje de error sigue siendo uno solo («usuario o contraseña
incorrectos») y el bloqueo por intentos es por lo que se escribió
(`cuenta:<identificador>`), exista o no.

`Usuario.identificador` es lo que se muestra: el email si hay, si no el
usuario. La sesión lo lleva en `email` (es el campo de Auth.js y solo se usa
para mostrar). Los JWT emitidos antes siguen sirviendo.

**No se copió el email como nombre de usuario** en las cuentas que ya
existían: habría sido el mismo dato en dos columnas, divergiendo en cuanto
alguien cambie uno. Esas cuentas siguen entrando con su email.

### Con qué entra una cuenta nueva (`DarAccesoPortal`)

Lo usan el alta (si se marcó «Darle acceso al portal») y la ficha («Darle
acceso»), que es el mismo camino:

| El email de la ficha…                                  | Resultado                                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------------- |
| no existe                                              | Cuenta nueva con el **usuario** (obligatorio)                             |
| está libre en la plataforma                            | Cuenta nueva que entra con ese email (y con el usuario, si se cargó)      |
| es la cuenta de un paciente de **otro** consultorio    | **No se crea nada**: `INVITACION`, se emite un código                     |
| es la cuenta de un paciente de **este** consultorio (un hermano) o de un profesional | Cuenta nueva **sin email de ingreso**: el usuario es obligatorio |

La contraseña queda provisional. Si algo falla después de crear la cuenta, se
borra (y en el alta, también la ficha).

**La pantalla pide el usuario solo cuando hace falta.** Mostrarlo siempre
—aunque opcional— hacía creer que era obligatorio. Mientras se escribe el
email, `RevisarEmailPaciente` (router `accesoPortal.revisarEmail`) contesta si
ese email ya es el ingreso de otra cuenta DE ESTE consultorio; con eso los
campos de acceso (`CamposAccesoPortal` y «Darle acceso» en la ficha) dicen
«va a entrar con su email» y dejan el usuario plegado como opcional, o lo piden
porque no tiene email o porque el suyo ya lo usa otra cuenta (un hermano).
El aviso **nombra a la dueña** de esa cuenta tal como la conoce este
consultorio («ya es con lo que entra Juan Manuel López Asis»): sin el nombre,
«lo usa otra cuenta de este consultorio» confundía cuando la cuenta es
compartida con otro consultorio —tiene ficha en los dos, y el profesional
creía que el mensaje hablaba del otro—. El nombre sale de una ficha de ESTE
consultorio; las de otros no se leen. La
validación del formulario pide el usuario en ese mismo caso (el campo oculto
`usuarioObligatorio`), que es el mismo en que lo pediría el alta. La consulta
no mira otros consultorios: si el email es de una cuenta de otro, lo resuelve
el alta con la invitación, sin contarle nada al profesional antes.

**El email de contacto repetido se avisa.** La misma consulta devuelve las
otras fichas del consultorio con ese email, y `AvisoEmailRepetido` las nombra
debajo del campo («Este email ya lo tiene Sofía Pérez. Si es un familiar, está
bien…»). Repetido a propósito es el caso de los hermanos; repetido por error
manda los avisos de un paciente a un tercero, y sin el aviso pasaba en
silencio.

### El código de invitación

**Ningún dato que tipee el profesional asocia una ficha a una cuenta que ya
existe.** Hasta la migración 80, `CrearPaciente` vinculaba sola la cuenta del
email del alta: un email mal escrito le abría la ficha a otra persona. Ahora
eso solo pasa con un código (`InvitacionPortal`) que canjea la persona
**entrando con su contraseña**: quien vincula demuestra que la cuenta es suya.

Los dos errores posibles no pesan lo mismo: una persona con dos cuentas es
incómodo; dos personas en una cuenta es una filtración. El diseño prefiere el
duplicado, y el mismo código es el que lo arregla.

- **Emitir** (`GenerarInvitacionPortal`, desde la ficha o automático en el
  alta que da `INVITACION`): 8 caracteres de un alfabeto sin 0/O ni 1/I/L
  (`K7PM-X3QD`), vence a los 7 días, uno vigente por ficha. Se guarda solo el
  SHA-256; el código se ve UNA vez en pantalla y, si se pide y hay email, sale
  en un email fijo (no una plantilla editable: tiene que llevar el código y el
  enlace sí o sí) con un enlace a `/mis-consultorios?codigo=…`. Si el email
  falla, el código igual se devuelve. En el alta sigue la política
  `bienvenidaAutomaticaActiva`.
- **No se emite** para una ficha con cuenta **compartida**: mudarla le sacaría
  el acceso a alguien que no participa.
- **Canjear** (`CanjearInvitacionPortal`, solo cuentas PACIENTE, 20 intentos
  por hora por cuenta y por IP) va en tres pasos porque el código llega antes
  de saber de qué consultorio es:
  1. `ubicar`, con alcance global: de qué consultorio es. Es lo único que
     cruza el límite.
  2. `previsualizar`, en ese consultorio: el profesional y **a nombre de quién
     está la ficha**. Un código que le llegó al email de la madre puede ser el
     de un hermano, y la pantalla dice «si no sos vos, no sigas».
  3. `canjear`, en ese consultorio: `vincular` la ficha a la cuenta de quien
     canjea. Si la ficha ya tenía una cuenta (exclusiva), **se muda y la vieja
     se borra** con sus sesiones: así se juntan dos cuentas de la misma persona.
- Código inexistente, vencido o usado: el mismo error
  (`ErrorInvitacionInvalida`), para no decir cuáles existieron.
- Si la cuenta ya tiene ficha en ese consultorio, se rechaza: una ficha por
  consultorio y por cuenta.

### Cambiar con qué se entra

- **La persona**, en «Mi perfil» → «Con qué entrás» (`CambiarMisDatosIngreso`):
  su email y su nombre de usuario, con la contraseña actual. Es como un
  paciente que entraba solo con usuario se agrega un email (y con él, «olvidé
  mi contraseña»). Lo puede hacer **aunque la cuenta sea compartida**: la
  cuenta es suya. Al menos uno de los dos, y el profesional siempre con email
  (`Usuario.cambiarIngreso`).
- **El profesional**, en la ficha → «Cambiar usuario»
  (`CambiarUsuarioPaciente`): pone, cambia o saca el usuario, **solo en una
  cuenta exclusiva**. El email de ingreso lo sigue llevando la edición de la
  ficha (ver la tabla de exclusividad).

### Por qué el nombre de usuario no es obligatorio

La regla real es «toda cuenta tiene con qué entrar», y la cumple el CHECK
`email IS NOT NULL OR nombreUsuario IS NOT NULL`. Hacer obligatorio el usuario
obligaría a inventárselo a todas las cuentas que ya existen y a cada una nueva
con email: un dato que la persona no eligió, no conoce y no necesita (entra con
su email). Y no agrega seguridad: identifica igual que el email.

### Recuperar la contraseña sin email

«¿Olvidaste tu contraseña?» acepta email o usuario y **responde siempre
lo mismo**: «si la cuenta existe y tiene email, te llegó un enlace; si entrás
con usuario y no tenés email, pedile a tu profesional». Una cuenta sin email
termina en silencio. El profesional la restablece desde la ficha
(`RestablecerPasswordPaciente`): generada o escrita, se muestra una vez para
entregarla en mano, queda provisional y cierra las sesiones persistentes. Solo
en cuentas exclusivas.

### La bienvenida y el usuario

`{{usuario}}` es con qué entra (email o usuario). `{{email}}` dice **lo mismo**:
las plantillas guardadas antes lo usaban como «con qué inicia sesión», y si
pasara a ser el email de contacto, al hermano que entra con usuario le diría
un email que no le sirve. El email sale al email de CONTACTO de la ficha; sin
email no sale nada y las credenciales se entregan en mano (el formulario las
muestra al crear la cuenta, con copiar e imprimir).

## Lo que NO hay que hacer

- **Nunca fijar la contraseña ni cambiar el email de login de una cuenta que
  no sea exclusiva.** Es la llave de las fichas de otro consultorio. Pasa por
  `esCuentaExclusiva`.
- **Nunca copiar al token lo que manda `update()`.** Es una preferencia: se
  revalida con `ResolverConsultorioActivo`.
- **Nunca volver a colgar la cuenta de una ficha** (`usuarios.pacienteId`) ni
  darle `nutricionistaId` a la cuenta de un paciente. Se llega a la cuenta por
  la ficha (`pacientes.usuarioId`, `IUsuarioRepositorio.obtenerPorPacienteId`).
- **Nunca consultar `usuarios` buscando cuentas de pacientes sin el filtro de
  `visibles`.** Con el filtro automático de la extensión, la cuenta no aparece,
  y sin ningún filtro aparecen las de todos los consultorios.
- **Nunca borrar la cuenta desde `EliminarPaciente` sin contar sus fichas**:
  se llevaría puesta la entrada al otro consultorio.
- **Nunca obligar a cambiar la contraseña provisional** sin revisar esta
  decisión: se eligió advertir, no bloquear.
- **Nunca asociar una ficha a una cuenta existente por un dato que cargó el
  profesional** (email, usuario, DNI, teléfono). Solo el canje de un código,
  que hace la persona con su contraseña.
- **Nunca aceptar un nombre de usuario con `@`**: el login dejaría de poder
  distinguirlo de un email. La regla está en el dominio, en el DTO y en un
  CHECK.
- **Nunca volver a hacer único el email de la ficha**: es de contacto, y dos
  hermanos pueden llevar el de la madre. El único es el de la CUENTA.
- **Nunca responder distinto en la recuperación según si la cuenta existe o
  tiene email**: es un enumerador de cuentas.
