# WhatsApp

La app habla con WhatsApp de dos maneras, y la segunda no reemplaza a la primera:
si la API oficial no está conectada, todo sigue funcionando por el enlace.

| | Fase A — enlace `wa.me` | Fase B — Cloud API oficial |
|---|---|---|
| Requisitos | ninguno | número dedicado + alta en Meta |
| Recordatorio de turno | abre el chat con el mensaje escrito; lo envía el profesional | sale solo desde el número del consultorio |
| "¿Se envió?" | lo declara el profesional (ámbar → verde) | lo confirma el webhook de entrega |
| Mensajes del paciente | no llegan a la app | aparecen en la ficha, pestaña WhatsApp |

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
   tipo *Business* y agregarle el producto **WhatsApp**.
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

| Síntoma | Causa habitual |
|---|---|
| Meta no valida el webhook (GET) | el verify token guardado no coincide con el que pusiste en Meta |
| Entran webhooks pero no pasa nada | falta el app secret → la firma se rechaza (401) |
| Llegan los mensajes de algunos pacientes y de otros no | el teléfono del paciente está mal cargado; se compara el E.164 normalizado |
| "WhatsApp rechazó el envío" fuera de las 24 h | ventana cerrada: hace falta una plantilla aprobada (ver abajo) |
| El envío automático no manda nada | falta la plantilla predeterminada, o no tiene cargado su nombre de Meta |

## Plantillas aprobadas: lo que la ventana de 24 h obliga

Un recordatorio de turno casi siempre se manda cuando el paciente no escribió
en las últimas 24 h, y ahí Meta solo acepta **plantillas aprobadas**. El flujo
completo es:

1. Dar de alta la plantilla en Meta Business (Cuenta de WhatsApp → Plantillas de
   mensaje), con el cuerpo en castellano y sus parámetros `{{1}}`, `{{2}}`…
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
