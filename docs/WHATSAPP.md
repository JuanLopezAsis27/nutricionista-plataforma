# WhatsApp

La app habla con WhatsApp de dos maneras, y la segunda no reemplaza a la primera:
si la API oficial no está conectada, todo sigue funcionando por el enlace.

|                       | Fase A — enlace `wa.me`                                      | Fase B — Cloud API oficial                |
| --------------------- | ------------------------------------------------------------ | ----------------------------------------- |
| Requisitos            | ninguno                                                      | número dedicado + alta en Meta            |
| Recordatorio de turno | abre el chat con el mensaje escrito; lo envía el profesional | sale solo desde el número del consultorio |
| "¿Se envió?"          | lo declara el profesional (ámbar → verde)                    | lo confirma el webhook de entrega         |
| Mensajes del paciente | no llegan a la app                                           | aparecen en la ficha, pestaña WhatsApp    |

> Los recordatorios de turno —a quién, cuándo, con qué texto y por qué medios—
> están documentados aparte, en [RECORDATORIOS.md](RECORDATORIOS.md). Acá va
> solo lo que hace falta para que WhatsApp funcione como canal.

## Fase A: no hay nada que configurar

El botón de recordatorio aparece en cada turno con el paciente que tenga teléfono
cargado. El texto sale de las plantillas de Dashboard → Recordatorios →
Plantillas; el prefijo de país, de Configuración → WhatsApp.

El teléfono se normaliza a E.164 antes de armar el enlace. **En Argentina los
celulares necesitan el `9` después del `54` y no llevan el `15`**: sin eso,
`wa.me` abre WhatsApp pero no encuentra el chat, que es el modo silencioso en
que esto falla. `011 15 5555-4444` se convierte en `5491155554444`.

## Fase B: conectar la Cloud API

### Lo que hay que aceptar antes de empezar

- **Un número dedicado.** Ese número deja de funcionar en la app de WhatsApp del
  celular: pasa a ser de la API y solo se lo maneja desde acá.
- **Sin historial previo.** Las conversaciones anteriores de ese número no se
  migran.
- **Ventana de 24 h.** Fuera de las 24 h desde el último mensaje del paciente,
  Meta rechaza el texto libre: hace falta una plantilla aprobada. La UI avisa
  antes de que el envío falle.

### Pasos

1. En [Meta for Developers](https://developers.facebook.com), crear una app de
   tipo _Business_ y agregarle el producto **WhatsApp**.
2. Dar de alta el número en Meta Business y anotar su **phone number id**.
3. Crear un **System User** con permiso sobre la cuenta de WhatsApp y generar un
   **access token permanente** (los tokens temporales duran 24 h).
4. Copiar el **app secret** de la app (Configuración → Básica).
5. En la app: **Integraciones → WhatsApp**, cargar
   phone number id, access token, app secret y un verify token inventado por
   vos. Los secretos se guardan cifrados (AES-256-GCM con `TOKENS_SECRET`) y no
   vuelven nunca al navegador.
6. En Meta, configurar el webhook con la URL que muestra esa misma pantalla
   (`https://TU-DOMINIO/api/whatsapp/webhook`), el verify token del paso
   anterior, y **suscribirse al campo `messages`**.

Alternativa para un despliegue de un solo consultorio: las variables
`WHATSAPP_*` de `.env` (ver `.env.example`). Las credenciales cargadas desde la
app tienen prioridad.

### El filtro de privacidad

Un profesional puede usar su número personal. Por eso, cuando entra un mensaje:

1. se normaliza el teléfono del remitente,
2. se busca un paciente **de ese inquilino** con ese número,
3. **si no matchea, el mensaje se descarta y no se persiste en ningún lado.**

Es descarte en la ingesta, no filtrado en la vista: un filtro de vista dejaría
los chats personales guardados en la base, que es exactamente lo que hay que
evitar.

### Seguridad del webhook

Es el único endpoint de la app que recibe datos sin sesión.

- El `phone_number_id` del cuerpo resuelve a qué inquilino pertenece el webhook
  (búsqueda en alcance global, igual que el login).
- La firma `x-hub-signature-256` se valida con el app secret **de ese**
  inquilino, sobre el cuerpo crudo (no el JSON re-serializado). Sin app secret
  configurado se rechaza todo.
- Recién con la firma válida se procesa, dentro de
  `ejecutarEnNutricionista(...)`.
- La ingesta es idempotente por `wamid`: Meta reintenta lo que no respondió 200.

### Diagnóstico

| Síntoma                                                | Causa habitual                                                             |
| ------------------------------------------------------ | -------------------------------------------------------------------------- |
| Meta no valida el webhook (GET)                        | el verify token guardado no coincide con el que pusiste en Meta            |
| Entran webhooks pero no pasa nada                      | falta el app secret → la firma se rechaza (401)                            |
| Llegan los mensajes de algunos pacientes y de otros no | el teléfono del paciente está mal cargado; se compara el E.164 normalizado |
| "WhatsApp rechazó el envío" fuera de las 24 h          | ventana cerrada: hace falta una plantilla aprobada (ver abajo)             |
| El envío automático no manda nada                      | falta la plantilla predeterminada, o no tiene cargado su nombre de Meta    |

## Plantillas aprobadas: lo que la ventana de 24 h obliga

Un recordatorio de turno casi siempre se manda cuando el paciente no escribió
en las últimas 24 h, y ahí Meta solo acepta **plantillas aprobadas**. Hay dos
maneras de tenerlas:

- **Crearla desde la app** (migración 73, ver «Plantillas creadas desde la
  app» más abajo): la app la da de alta en Meta, la manda a revisión y le sigue
  el estado. Es el camino normal si está cargado el ID de la cuenta de WhatsApp
  Business.
- **Crearla a mano en Meta y vincularla** por su nombre, que es lo que había
  antes y sigue sirviendo. El flujo es:

1. Dar de alta la plantilla en Meta Business (Cuenta de WhatsApp → Plantillas de
   mensaje), con el cuerpo en castellano y sus parámetros **numerados**:
   `{{1}}`, `{{2}}`… (ver abajo: el editor de Meta ofrece también variables con
   nombre, y esas NO sirven).
2. Esperar la aprobación (suele tardar minutos, a veces horas).
3. En la app: **Recordatorios → Plantillas**, cargar el mismo texto y anotar el
   **nombre en Meta**, el **idioma** y el **orden de los parámetros**.

El orden importa y no hay forma de que la app lo adivine: Meta numera los
parámetros en vez de nombrarlos, así que si el orden no coincide con el de la
plantilla aprobada, al paciente le llega la fecha donde va el nombre. La app
manda `parameters` en el orden exacto que se haya guardado.

Sin nombre de Meta la plantilla sigue sirviendo (vista previa y enlace `wa.me`),
pero el envío automático por API no va a salir. La pantalla lo dice antes de
que Meta lo rechace.

### Variables numeradas, no con nombre

El editor de Meta ofrece dos formas de declarar las variables de una plantilla
y **la app solo habla una**: la posicional. Una plantilla creada con variables
CON NOMBRE (`{{nombre_paciente}}`) exige que cada parámetro del envío viaje con
su `parameter_name`, y la app manda `parameters` por posición, como dice el
contrato de `variablesMeta`.

El síntoma es un recordatorio FALLIDO con el motivo **«Parameter name is
missing or empty»**, que es de Meta y no de la app. No hay nada que revisar en
la configuración ni en el orden de los parámetros: la plantilla hay que
recrearla en el Administrador de WhatsApp con `{{1}}`, `{{2}}`… y volver a
esperar la aprobación.

`traducirRechazo` (`ProveedorWhatsappCloudApi.ts`) convierte ese rechazo en esa
instrucción, en castellano y conservando el texto de Meta entre paréntesis para
poder contrastarlo. Es lo ÚNICO que traduce: un rechazo que no conocemos pasa
tal cual, porque inventarle una explicación manda a mirar donde no hay nada.

## Plantillas creadas desde la app

Desde **Recordatorios → Plantillas**, con la opción «Crear en Meta», la app da
de alta la plantilla en la cuenta de WhatsApp Business del consultorio por la
API de administración de Meta (`IAdministradorPlantillasMeta`,
`infraestructura/whatsapp/AdministradorPlantillasMeta.ts`), la manda a revisión
y muestra en qué quedó.

**Qué hace falta.** Además del token y el phone number ID que usa el envío, el
**ID de la cuenta de WhatsApp Business** (WABA ID), que se carga en
Integraciones → WhatsApp, y que el token tenga el permiso
`whatsapp_business_management`. Enviar y administrar son dos APIs distintas de
Meta: un consultorio puede mandar mensajes sin poder crear plantillas, y por
eso es otro puerto y no un método más de `IProveedorWhatsapp`. El WABA ID se
guarda en claro, como el phone number ID: es lo que identifica al consultorio
en los webhooks de estado de plantillas (ver abajo).

**Meta va primero.** El alta y la edición llaman a Meta ANTES de guardar. Si
Meta la rechaza (nombre repetido, formato inválido, token sin permiso) no se
guarda nada y el profesional corrige sobre el mismo formulario. Al revés
quedaría una plantilla que la app muestra con un texto y Meta tiene con otro, y
al paciente le llegaría el de Meta. Los errores 4xx de Meta salen como
`ErrorValidacion` con el motivo (es algo que el profesional corrige); un 5xx es
un error del sistema.

**Las variables se numeran solas.** En las creadas desde la app no se elige el
orden de los parámetros: cada `{{variable}}` del cuerpo pasa a `{{1}}`,
`{{2}}`… en orden de aparición (`PlantillaWhatsapp.formatoMeta()`), y eso
queda en `variablesMeta`. Los ejemplos que pide Meta para revisarla salen de
los mismos valores que la vista previa. Lo que Meta rechazaría se frena antes,
en castellano (`validarParaMeta`): el cuerpo **no puede empezar ni terminar con
una variable** —el texto por defecto termina en `{{profesional}}`, así que hay
que agregarle un punto—.

**Qué se puede editar.** El nombre en Meta y el idioma son la identidad de la
plantilla allá y no se cambian: la entidad lo rechaza. Si cambia lo que Meta
revisa —cuerpo, botones o categoría— la edición se manda a Meta y la plantilla
vuelve a EN_REVISION; marcarla predeterminada o asignarle un día no toca Meta.
Meta limita las ediciones de una plantilla aprobada (una por día, pocas por
mes): ese rechazo llega como error y no se guarda nada.

**Borrar.** Una creada desde la app (`idMeta` presente) se borra también en
Meta, que no deja reusar ese nombre por 30 días. Una vinculada a mano NO se
toca en Meta: la creó otra persona, afuera de la app.

### El estado de la revisión

`estadoMeta` pliega los estados de Meta a cinco: EN_REVISION, APROBADA,
RECHAZADA (con el motivo, traducido cuando se conoce), PAUSADA y
DESHABILITADA (`estadosPlantillaMeta.ts`). `null` es «nunca se consultó»: una
vinculada a mano, que se sigue tratando como aprobada, igual que antes.

**Solo sale por la API una APROBADA** (`admiteEnvioPorApi`): una en revisión o
rechazada la rebotaría Meta. El barrido automático y el chat la ignoran hasta
que se apruebe.

El estado llega por dos caminos, que terminan en el mismo caso de uso
(`RegistrarEstadosPlantillasMeta`):

- **El webhook** `message_template_status_update`. Hay que suscribir la app de
  Meta a ese campo además de `messages`. Esos avisos no traen
  `phone_number_id`, solo el id de la cuenta en `entry[].id`: por eso la ruta
  resuelve al consultorio por el WABA ID cuando no hay número
  (`DirectorioWhatsapp.porWabaId`).
- **«Actualizar estado»**, que trae de Meta todas las plantillas de la cuenta
  (`SincronizarPlantillasMeta`). Es el respaldo si el webhook no está
  suscripto. Como esa lista es COMPLETA, una plantilla con nombre de Meta que no
  aparece queda DESHABILITADA («no existe en la cuenta»): mejor saberlo ahí que
  por un recordatorio fallido. El webhook, que avisa de a una, nunca deduce
  ausencias.

A las vinculadas a mano también se les actualiza el estado (se las busca por
nombre e idioma, porque no tienen `idMeta`): saber que Meta las pausó sirve
igual. Saber el estado no las vuelve administradas.

## Botones

Una plantilla creada desde la app puede llevar hasta 10 botones (2 de enlace
como máximo, 25 caracteres de texto). Dos tipos:

- **Respuesta rápida.** Al tocarla, al chat llega el texto del botón. Cada una
  tiene una acción: **confirmar el turno**, **pedir reprogramar**, **pedir
  cancelar** (migración 76) o ninguna.
- **Enlace.** Uno de cuatro destinos:
  - fijo (`https://…`);
  - **confirmar el turno** y **cancelar el turno**: los mismos enlaces firmados
    del recordatorio por email. Se registran en Meta como URL dinámica
    (`…/confirmar-turno?token={{1}}`, `…/cancelar-turno?token={{1}}`) y en
    cada envío se completa solo el token (`IEnlacesTurno.prefijo(accion)`);
  - **chat de cancelaciones**: abre WhatsApp con el número de cancelaciones del
    consultorio (Configuración → WhatsApp) y un mensaje ya escrito, propio de
    cada botón. Existe porque el número que manda los recordatorios muchas
    veces no es el que el profesional usa todos los días. Se registra como
    `https://wa.me/{{1}}`: el número va en la parte dinámica junto con el
    texto, así cambiar de número no obliga a mandar la plantilla a revisión.
    Sin número cargado, la plantilla no se puede enviar y el recordatorio
    queda FALLIDO con ese motivo (no corta el barrido de los demás turnos).

**El orden es parte del contrato.** Meta identifica a cada botón por su
posición al enviar, y exige que los del mismo tipo estén juntos: la entidad
guarda siempre las respuestas rápidas primero y los enlaces después, y el
índice de cada botón es su lugar en esa lista. Por eso `botones` es un JSONB
ordenado y no una tabla.

**Qué cambio la vuelve a revisión.** Solo lo que Meta revisa: cuerpo,
categoría o botones. Los botones se comparan por lo que significan
(`firmaDeBotones`), no por su JSON guardado: los guardados antes de un campo
nuevo no lo tienen (`mensaje`, migración 76), la edición lo completa con
`null`, y comparando el JSON crudo marcar una plantilla como predeterminada la
mandaba a revisión otra vez sin haber cambiado nada. Si se agrega otro campo a
un botón, va también en `firmaDeBotones`.

**La acción viaja en el payload, no en el texto.** En cada envío, cada
respuesta rápida lleva `ACCION:turnoId` como payload
(`dominio/servicios/botonesWhatsapp.ts`), y Meta lo devuelve tal cual cuando el
paciente la toca (mensaje de tipo `button`). Así el profesional le pone al
botón el texto que quiera, y si el paciente tiene dos turnos con recordatorio
se sabe a cuál contestó. Sin turno (una plantilla mandada desde el chat a
alguien sin turno próximo) el payload es `NINGUNA` y tocarlo no hace nada.

Al tocar un botón (`AtenderBotonWhatsapp`):

- **Confirmar** pasa el turno a CONFIRMADO por `ConfirmarAsistenciaTurno`, el
  MISMO camino que el enlace del email: mismo aviso en la campana, mismo email
  al profesional.
- **Reprogramar** no toca el turno —reprogramar necesita acordar otro horario—
  y deja un aviso `REPROGRAMACION_PEDIDA` en la campana.
- **Pedir cancelar** tampoco lo toca: deja `CANCELACION_PEDIDA` en la campana
  y el profesional lo cancela al leerlo. Es deliberado que una respuesta
  rápida NO cancele: se toca sin querer, no tiene segundo paso y cancelar no
  se deshace. Para que el paciente cancele sin intervención está el enlace
  «cancelar el turno», que pasa por una página que se lo pide confirmar.
- El recordatorio queda CONFIRMADO o RESPONDIDO según el botón, sin pasar por
  la lista de afirmaciones: «Confirmo» no está en ella, y no tiene por qué.
- El turno tiene que ser de ESE paciente y estar pendiente o confirmado. Si no
  (se canceló, ya pasó), el toque queda como un mensaje más y el aviso de
  «escribió por WhatsApp» de siempre es el que se lo cuenta al profesional.
  Cuando el botón SÍ actuó, ese aviso no se suma: diría lo mismo dos veces.

El toque queda en el chat como un mensaje entrante (el texto del botón), y
abre la ventana de 24 h como cualquier otro mensaje del paciente.

Las vinculadas a mano no llevan botones desde la app: la app no sabe qué
botones tiene esa plantilla en Meta, y mandarle parámetros de botones que no
existen hace que Meta rechace el envío.

## Mandar una plantilla desde el chat

Con la ventana de 24 h cerrada, el chat de WhatsApp ofrece las plantillas
aprobadas (`EnviarPlantillaWhatsapp`). Los datos del turno (fecha, hora, sede)
y los botones que actúan sobre él se completan con el **próximo turno** del
paciente —pendiente o confirmado, de hoy en adelante—. Una plantilla que los
necesita (`necesitaTurno`) no se puede mandar a quien no tiene ninguno; una que
solo nombra al paciente y al profesional, sí.

No es un recordatorio: no entra en el log de recordatorios ni en su
antiduplicado. Es un mensaje del chat que sale por plantilla, y queda en el
hilo como cualquier otro.

## Los recordatorios también son parte del chat

El chat de la app (bandeja y ficha del paciente) lee **solo** `mensajes_whatsapp`.
Los recordatorios viven en otra tabla, `recordatorios_whatsapp`, que es el log
de avisos con sus reglas de antiduplicado. Durante un tiempo el recordatorio
escribía únicamente ahí: la plantilla le llegaba al paciente, pero en la
conversación de la app no aparecía, y si el paciente contestaba, su respuesta
quedaba colgada sin el mensaje que la originó.

Ahora `EnviarRecordatorioWhatsapp`, cuando el aviso **sale por la API**, deja
además una fila SALIENTE en `mensajes_whatsapp` con el mismo `idExterno`
(wamid). Por compartir el wamid, el webhook de estado (`RegistrarEstadoWhatsapp`)
mueve las dos filas —la del log y la del hilo— a ENTREGADO / LEIDO / FALLIDO.

- Con el enlace `wa.me` **no** se escribe en el hilo: el mensaje todavía no
  salió (lo manda el profesional a mano) y, sin la API, el chat de la app no
  existe.
- Las dos tablas no se funden: el log de recordatorios responde "¿a este turno
  ya se le avisó?" y el hilo responde "¿qué se habló con este paciente?". Son
  preguntas distintas con reglas distintas (el log reusa filas al reintentar;
  el hilo es append-only).
- Los recordatorios enviados antes de este cambio no aparecen en el chat: no
  se reconstruyeron.
