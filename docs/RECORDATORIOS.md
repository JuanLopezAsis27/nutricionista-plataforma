# Recordatorios de turno

Tres medios para el mismo aviso, cada uno con su interruptor: **WhatsApp**,
**email** y **calendario**. Se configuran todos juntos en
**Dashboard → Recordatorios**, porque para el profesional son una sola decisión
("¿cómo aviso los turnos?") aunque por dentro los ejecuten piezas distintas.

## Dónde vive cada cosa, y por qué

|                                  | Dónde                                      |
| -------------------------------- | ------------------------------------------ |
| Elegir a quién avisarle y mandar | Recordatorios → **Enviar**                 |
| Declarar qué mensajes salieron   | Recordatorios → Enviar → **Sin confirmar** |
| Ver quién contestó               | Recordatorios → **Seguimiento**            |
| Medios, anticipación y disparo   | Recordatorios → **Programación**           |
| Texto del mensaje de WhatsApp    | Recordatorios → **Plantillas**             |
| Texto del mensaje de email       | Recordatorios → **Plantillas**             |
| Bienvenida y otros emails        | Configuración → **Plantillas de email**    |
| La conversación con el paciente  | Mensajes → pestaña **WhatsApp**            |

**En la grilla de turnos no hay nada de esto.** Hubo un botón de recordatorio
por turno y se sacó: avisar es una tarea de secretaría —se elige a quién, con
qué texto, y después hay que declarar cuáles salieron— y ese último paso no
tenía dónde ocurrir una vez cerrado el diálogo, así que el aviso quedaba
colgado en PREPARADO para siempre.

La decisión de fondo: **los recordatorios son secretaría, no mensajería.**
Elegir a quién avisarle, con cuánta anticipación y por qué vía es una tarea
administrativa, y se parece mucho más a los recordatorios por email —que ya
vivían en Secretaría— que al hilo de WhatsApp de un paciente. Las
conversaciones siguen en Mensajes, que es donde uno las busca, y Seguimiento
lleva a cada una con un clic.

## Un solo camino por medio

Cada medio se manda desde **un** lugar, y es deliberado: dos botones para el
mismo aviso terminan mandándolo dos veces.

- El **email** salía por su propio cron diario y por un botón en Secretaría.
  Ahora sale por el mismo barrido que WhatsApp y por el mismo envío manual, con
  la misma anticipación configurable.
- **WhatsApp** se manda desde la consola (manual) o por el barrido
  (automático), las dos apoyadas en el mismo motor de envío.

El worker tiene UN trabajo (`recordatorios-turnos`, cada hora) que corre los
dos medios. Un medio que falla no frena al otro.

**Secretaría ya no existe como pantalla.** Era media tarea en otro lado: el
texto del recordatorio por email y un segundo botón para dispararlo, mientras
la otra mitad vivía acá. Se fusionó con Recordatorios; los emails que NO son
recordatorios (bienvenida y plantillas propias) quedaron en Configuración →
Plantillas de email. `/dashboard/plantillas` redirige acá.

**El envío manual manda por todos los medios activos**, no solo por WhatsApp:
el profesional que tilda pacientes y aprieta Enviar espera que salga el aviso,
no que salga por una vía y por la otra no.

## Los dos interruptores de cada medio

No son lo mismo y conviene no confundirlos:

- **Activo** — si el medio se usa. Apagado, no aparece ni para el envío manual.
- **Automático** — si además sale solo, sin que nadie apriete nada.

Un medio activo pero no automático es exactamente el caso del profesional que
quiere elegir a mano a quién le manda. Es el estado en que arranca WhatsApp:
que salgan mensajes solos por un canal que le llega al teléfono al paciente —y
que Meta factura por conversación— es una decisión suya, no un default nuestro.

## Anticipación: una lista, no un número

`3 días antes` y `1 día antes` marcados son **dos** avisos. La cantidad de
recordatorios es la cantidad de opciones tildadas, hasta cinco por medio.

El barrido de WhatsApp corre **cada hora** y cada consultorio se apaga solo
cuando no es la hora que configuró. Es más simple que un cron por inquilino
—que además habría que rearmar cada vez que alguien cambia el horario— y más
robusto ante un worker que arrancó tarde.

## Que no se mande dos veces

Es la garantía central de la feature y la da el motor, no el código de la app:

```sql
UNIQUE (nutricionistaId, turnoId, diasAntes)
```

Cada escalón de la programación entra **una sola vez** por turno. No es un
leer-y-después-escribir, que dos procesos concurrentes pasan los dos.

Los envíos **manuales** llevan `diasAntes` en NULL, y en Postgres los NULL no
colisionan entre sí. Ahí la protección no es el índice sino un **margen de
horas**: se omite a quien recibió un aviso hace menos de N horas (configurable
en Programación, 1 día por defecto), y pasado ese plazo se lo puede volver a
avisar sin tocar nada.

Que el bloqueo sea temporal importa: un turno agendado con tres semanas y
reprogramado dos veces necesita más de un aviso, y con un "ya se le avisó"
definitivo la única salida era tildar **«Reenviar a quienes ya recibieron el
aviso»**, que apaga la protección para TODO el lote. Esa casilla sigue estando
para la insistencia dentro del margen.

El mismo margen rige para el email, pero la idempotencia dura de los escalones
programados no cambia: el barrido lo corre el worker y puede reintentar, así
que ahí tiene que ser imposible mandar dos veces lo mismo.

Un envío que falla se registra igual (estado `FALLIDO`, con el motivo de Meta):
el profesional tiene que poder ver a quién NO le llegó. El reintento **reusa
esa fila** en vez de insertar otra, que es lo que permite reintentar sin abrir
la puerta al duplicado.

### El log registra envíos, no intentos

Esta es la regla que evita que se apilen avisos, y costó dos vueltas dar con la
formulación correcta.

Un aviso que **no llegó a salir** —el borrador sin confirmar (`PREPARADO`), el
que el profesional descartó (`DESCARTADO`), el que el proveedor rechazó
(`FALLIDO`)— no es una línea de historia: es el mismo aviso todavía pendiente.
El intento siguiente lo REUSA en lugar de insertar otra fila.

El primer arreglo solo reusaba el `PREPARADO`, y por eso el bug seguía vivo por
el otro lado: preparar → descartar → preparar → descartar insertaba una fila
por vuelta, sin techo. Un turno llegó a tener 19.

Un reenvío manual sobre un aviso QUE SÍ SALIÓ crea fila nueva: ahí la
insistencia es real, y pisar la anterior convertiría "le mandé el lunes y volví
a insistir el jueves" en "le mandé el jueves".

La pregunta que lo decide todo es `RecordatorioWhatsapp.salio`.

Los borradores se resuelven en **Enviar → Sin confirmar**: cada uno con su
enlace para reabrir el chat, «Ya lo mandé» (pasa a `ENVIADO`) y descartar (pasa
a `DESCARTADO`). Con la Cloud API conectada esa bandeja está siempre vacía: lo
confirma el webhook de entrega.

## Estados: del envío a la respuesta

```
PREPARADO → ENVIADO → ENTREGADO → LEIDO → RESPONDIDO → CONFIRMADO
                  ↘ FALLIDO        ↘ DESCARTADO
```

Los primeros cuatro son del **canal** y los informa el webhook de Meta.
`PREPARADO` solo existe con el enlace `wa.me`: significa "se abrió el chat con
el mensaje cargado", nunca "se envió".

Los dos últimos son del **paciente**, y son la mitad interesante:

- `RESPONDIDO` — escribió después de que saliera el aviso. Es un hecho.
- `CONFIRMADO` — su respuesta fue un sí inequívoco. Es una interpretación, y
  por eso se limita a las afirmaciones cortas ("sí", "dale", "confirmo"): una
  respuesta larga se marca como respondida y la lee el profesional. Una
  negación en cualquier parte del texto descarta la confirmación, porque el
  error caro es dar por confirmado un turno que el paciente está cancelando.

`FALLIDO` y `DESCARTADO` no son lo mismo: el primero es que Meta lo rechazó, el
segundo es que el profesional decidió no mandarlo.

## Plantillas de WhatsApp: dos caras

Una plantilla guarda **el texto** y, opcionalmente, **la plantilla aprobada en
Meta**. Las dos hacen falta:

- `cuerpo` — el texto en castellano con `{{paciente}}`, `{{fecha}}`, `{{hora}}`
  y `{{profesional}}`. Es lo que se ve en la vista previa y lo que viaja por el
  enlace `wa.me`.
- `claveMeta` + `variablesMeta` — el nombre de la plantilla aprobada y el ORDEN
  de sus parámetros. Meta los numera (`{{1}}`, `{{2}}`…) en vez de nombrarlos,
  así que el orden es parte del contrato: mal puesto, al paciente le llega la
  fecha donde va el nombre.

**Por qué importa:** fuera de las 24 h desde el último mensaje del paciente, la
Cloud API rechaza el texto libre — y un recordatorio de turno casi siempre cae
fuera de esa ventana. Sin `claveMeta`, la plantilla sirve igual para el enlace
`wa.me` y para la vista previa, pero el envío automático por API no va a salir.
La pantalla lo dice antes de que Meta lo rechace.

**Editar el texto antes de mandar:** cada fila de la consola tiene «Editar y
enviar», que abre el mensaje ya armado para retocarlo y mandárselo a ESE
paciente. NO saltea la protección: elegir el texto no es lo mismo que decidir
insistir, y el diálogo respeta el margen igual que el envío masivo. Existe porque el texto de la plantilla no siempre sirve tal cual, y
editar la plantilla —que es de todos— para decirle algo a uno solo es
desproporcionado.

Un cuerpo retocado sale como texto libre y NUNCA bajo el nombre aprobado de
Meta: ya no coincide con lo aprobado, y mandarlo así haría que el paciente
leyera la plantilla en lugar de lo recién escrito. El diálogo lo avisa, porque
fuera de la ventana de 24 h eso significa que la API lo va a rechazar.

Hay siempre **una predeterminada** y no se puede borrar: es la que usa el
barrido automático, y quedarse sin ella se descubre el día en que los avisos no
salieron. Para reemplazarla, primero se marca otra.

## Calendario: el paciente como invitado

Al agendar un turno se crea el evento en el Google Calendar del consultorio. Lo
que lo convierte en un recordatorio **para el paciente** es sumarlo como
invitado con `sendUpdates=all`: Google le manda la invitación, el turno le queda
en SU calendario y los avisos configurados suenan en su teléfono. Sin eso, el
evento existe solo del lado del profesional.

Necesita que el paciente tenga email cargado y Google conectado en
Integraciones; si falta cualquiera de los dos, el evento se crea igual en el
calendario del consultorio y la pantalla explica qué falta.

Cancelar un turno borra el evento **aunque el medio se haya apagado después**:
lo contrario le deja al paciente un turno fantasma en su calendario.

## Cómo verificarlo en desarrollo

1. `npm run worker` — registra el barrido `recordatorios-turnos`, que corre
   cada hora y cubre los dos medios.
2. Los emails caen en Mailpit (`localhost:8025`). Salen por el mismo barrido
   que WhatsApp, así que el botón «Enviar los de hoy ahora» los dispara.
3. Sin credenciales de la Cloud API, WhatsApp degrada a enlaces `wa.me`: el
   envío masivo devuelve la lista de chats para abrir a mano.
4. El botón **«Enviar los de hoy ahora»** de Programación dispara el barrido
   ignorando la hora configurada.
