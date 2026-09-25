# La campana: qué llega ahí y cómo se apaga

El Centro de Notificaciones es **un solo feed** con todo lo que el nutricionista
tiene que mirar. Lo que hay que entender antes de tocarlo es que sus fuentes son
de **dos clases distintas**, y que la diferencia no es de implementación sino de
qué significa cada cosa.

## Las alertas de seguimiento NO van en la campana

Estuvieron y se sacaron. Una alerta («no registra el peso hace 15 días») es un
estado del paciente que se trabaja con tiempo; la campana es para lo que acaba
de pasar (te escribió, canceló el turno). Mezcladas, las alertas —que son
muchas y se regeneran solas— tapaban los avisos urgentes y hacían que el globo
nunca bajara de 9+. Viven solo en el panel **Alertas de seguimiento** del
dashboard (`PanelAlertas`), que tiene además el «Revisar ahora» que antes
estaba en la campana. Lo que sigue sobre alertas explica la diferencia de
naturaleza, que sigue valiendo.

## Derivadas vs. persistidas

| | **Derivadas** | **Persistidas** |
| --- | --- | --- |
| Cuáles | Correo fallido (y, en el dashboard, la alerta de seguimiento) | Mensaje del chat, WhatsApp entrante, turnos, bienvenida fallida |
| De dónde salen | De su propia tabla, leídas al vuelo | De `notificaciones` |
| Qué son | Un ESTADO que hoy es verdadero | Un HECHO que ya ocurrió |
| Cómo se apagan | Resolviendo el hecho (resolver la alerta, leer el mensaje) | Marcándolas vistas |
| ¿Se regeneran? | Sí, el barrido puede volver a crearlas | No |

Una alerta de seguimiento dice «este paciente no registra el peso hace 15 días»:
es una afirmación sobre el presente, y deja de ser cierta cuando el paciente
registra el peso. Una notificación dice «el paciente escribió a las 22:10»: eso
ya pasó y va a seguir habiendo pasado siempre. Por eso una se resuelve y la otra
solo se ve.

**Por eso `Notificacion` no es un tipo más de `AlertaSeguimiento`.** Meterlas en
la misma tabla habría obligado al barrido automático a aprender a no tocar la
mitad de sus filas.

## Qué genera una notificación

| Evento | Dónde se emite | ¿Agrupa? |
| --- | --- | --- |
| El paciente escribe por el chat de la app | `EnviarMensaje` | sí |
| El paciente escribe por WhatsApp | `ProcesarMensajeEntranteWhatsapp` | sí |
| El paciente confirma el turno desde el enlace del recordatorio | `ConfirmarAsistenciaTurno` | no |
| La bienvenida del alta no se pudo mandar | `EnviarBienvenidaAlAlta` | no |

### El mensaje del chat estuvo del lado derivado

Al principio el mensaje del chat de la app se mostraba derivando de
«conversaciones con mensajes sin leer», que es la tabla que ya existía. Eso tenía
una consecuencia que se ve enseguida al usarlo: **apenas se abría la
conversación, el aviso desaparecía del feed**, porque lo que lo sostenía era el
contador de no leídos. Mientras tanto, los otros dos avisos del mismo paciente
quedaban en la lista marcados como vistos.

Dos señales de la misma naturaleza —el paciente te escribió— no pueden
comportarse distinto en la misma campana, así que se movió al lado persistido
(`MENSAJE_APP`). El contador de no leídos no se perdió: sigue en la bandeja de
Mensajes, que es donde se responde.

### El pedido de reprogramación

`REPROGRAMACION_PEDIDA` (migración 73) sale cuando el paciente toca el botón
«reprogramar» de una plantilla de WhatsApp (`AtenderBotonWhatsapp`, ver
`docs/WHATSAPP.md`). Es persistido por lo mismo que la confirmación: es un
hecho que ya ocurrió, no algo que un barrido pueda regenerar. En el feed se ve
como un aviso de TURNO. Cuando un botón actuó, no se suma además el aviso de
«escribió por WhatsApp»: dirían lo mismo dos veces.

### La cancelación

Dos avisos distintos, porque son dos hechos distintos (migración 76):

- `TURNO_CANCELADO` — el paciente canceló desde el enlace del recordatorio
  (`CancelarTurnoPorPaciente`). El turno YA está cancelado y el horario libre.
  Además del aviso persistido sale un evento `turno.cancelado` (toast y
  refresco de la agenda) y un email, igual que la confirmación.
- `CANCELACION_PEDIDA` — tocó «pedir cancelar» en una respuesta rápida de
  WhatsApp. El turno NO se tocó: el aviso dice que sigue en la agenda hasta
  que lo cancele el profesional.

### La bienvenida que no salió

`BIENVENIDA_FALLIDA` (migración 77) sale cuando al dar de alta un paciente su
email de bienvenida no se pudo mandar. Sin el aviso, el alta decía «creado» y
nadie se enteraba de que el paciente se quedó sin sus datos de acceso. Se
detectan dos casos:

- **El dominio no recibe correo** (`ana@gmial.com`): se pregunta por DNS antes
  de mandar (`IVerificadorDominioEmail`, MX y si no A/AAAA) y no se manda. Si
  el DNS no contesta, se manda igual: un problema de red propio no puede
  convertirse en «el email no existe».
- **El servidor de correo lo rechaza** al enviar: el motivo técnico va en el
  detalle.

Lo que **no** se puede detectar: una casilla inexistente en un dominio que sí
recibe (`anaaa@gmail.com`). El servidor la acepta y el rebote llega minutos
después a una casilla que la app no lee.

El aviso enlaza a la ficha del paciente, que es donde se corrige el email; la
bienvenida se reenvía desde Pacientes. En el feed se ve como un CORREO.

### El agrupado: una línea por paciente, no una por mensaje

Un aviso de mensaje **refresca el que esté pendiente** en vez de abrir otro
(`agruparMientrasNoSeVea`). Por WhatsApp la gente escribe en ráfaga —una idea por
mensaje—, y sin esto diez mensajes de un minuto dejaban diez líneas idénticas que
tapaban todo lo demás. Es también lo que hacía el contador de no leídos: una fila
por conversación, con lo último que escribió.

Solo agrupa **mientras no se vio**. Una vez visto, el aviso es historia: pisarlo
borraría el registro de que ya se atendió, así que el mensaje siguiente abre uno
nuevo. Por eso `Notificacion.refrescar()` devuelve la misma instancia si ya está
vista.

El turno confirmado **no** agrupa: cada confirmación es un hecho distinto y
juntarlas escondería la segunda.

### Por qué se persisten, si ya había avisos en vivo

Las tres ya avisaban por el **bus** (`pg_notify`) y la del turno además por
email, pero los dos canales son efímeros: el bus solo llega a quien tenga la app
abierta en ese instante, y el mail se pierde entre otros cincuenta. Un WhatsApp
que entra a las 22:10 tiene que seguir estando a la mañana siguiente.

Los avisos en vivo **no se sacaron**: son complementarios. El bus hace que el
hilo abierto se entere sin recargar; la notificación es la que queda.

### Emitir nunca falla

`EmitirNotificacion` **no lanza**: devuelve `true`/`false` y registra el error.
Quien lo llama está en medio de algo que ya salió bien y que no se puede
deshacer —el mensaje ya se guardó, el turno ya quedó confirmado—. Que falle el
aviso no puede tirar abajo esa operación ni mostrarle un error al paciente, que
no tiene nada que ver ni nada que hacer al respecto. Es el mismo criterio con el
que `ConfirmarAsistenciaTurno` ya envolvía su email en un `try/catch`.

## El texto se congela al crearla

El título y el detalle se escriben al emitir la notificación y se guardan, en
vez de derivarse al leer. Es lo contrario de lo que hace la antropometría
—donde nada derivado se persiste— y es a propósito: una notificación cuenta algo
que pasó **en un momento dado**. Si el texto se recalculara, un paciente que
después cambia de apellido reescribiría el aviso de hace tres meses, y un turno
borrado dejaría el aviso sin nada que decir.

Lo que se congela es el relato de un hecho, no un cálculo clínico.

## Marcar como vista

- **Al abrirla**: tocar la notificación navega a su pantalla y la marca vista.
- **Al abrir la conversación, por donde sea**: el aviso de un mensaje se da
  por visto cuando se abre ese chat desde la bandeja, la ficha o la tarjeta
  del inicio, no solo tocando la notificación
  (`MarcarAvisosDeConversacionVistos`). Si el mensaje ya se leyó, el aviso que
  lo anuncia no tiene nada más que decir. Solo el aviso de ESE canal —abrir el
  portal no atiende lo que escribió por WhatsApp— y solo los de mensajes: un
  pedido de reprogramar o cancelar es un pendiente del turno.
- **Los avisos de WhatsApp abren WhatsApp**: enlazan con `&canal=whatsapp`. Sin
  eso llevaban al chat del portal, que mostraba otra conversación. La
  migración 77 corrigió también los que ya estaban guardados.
- **Con el tilde**: cada notificación sin ver tiene su botón, para atenderla sin
  tener que ir a la pantalla que enlaza.
- **"Marcar vistas"**: aparece en el encabezado solo si hay alguna pendiente.

**Las vistas se siguen mostrando**, apagadas. La campana es también el registro
de lo que pasó, y una notificación que desaparece apenas se la mira no se puede
volver a buscar. Lo que cambia al verla es que deja de contar para el globo.

Marcarla es **idempotente**: si ya estaba vista, conserva la fecha original.
Pisarla haría que «visto hace un mes» se volviera «visto recién» cada vez que se
abre la campana.

El globo cuenta las notificaciones sin ver. Los correos exitosos
no entran (son un registro automático y llenarían la campana de ruido); los
fallidos sí, porque un mail que no llegó al paciente es accionable, pero tampoco
suman al globo —no tienen estado de leído—.

## Multi-inquilino

`Notificacion` **es tabla de inquilino** y está en `MODELOS_INQUILINO`. Sin eso,
sus consultas por id cruzarían avisos entre consultorios.

Los dos emisores corren **sin sesión** —el webhook de Meta y el enlace del email
del paciente—, así que ninguno puede usar `conAlcanceDeSesion`. Los dos fijan el
inquilino explícitamente antes de tocar la base:

- el webhook, con `ejecutarEnNutricionista(inquilino.nutricionistaId, …)`
  resuelto por el número de teléfono del consultorio;
- la confirmación, con el `nutricionistaId` que viaja **firmado** en el token del
  enlace.

`marcarVista` usa `updateMany` y no `update`: con `update`, un id de otro
consultorio no daría cero filas sino que LANZARÍA (P2025), y eso convierte un id
inventado en una confirmación de que existe.

## Lo que NO hacer

- **Nunca convertir una notificación en un tipo de `AlertaSeguimiento`**: son dos
  ciclos de vida distintos y el barrido automático pisaría lo que no es suyo.
- **Nunca hacer que `EmitirNotificacion` lance**: el hecho que la origina ya
  ocurrió y no se puede deshacer.
- **Nunca recalcular el título o el detalle al leer**: reescribiría el pasado.
- **Nunca olvidar `Notificacion` en `MODELOS_INQUILINO`** al tocar el schema;
  `modelosInquilino.test.ts` lo verifica.
- **Nunca notificar un WhatsApp de un número que no es de un paciente**: en la
  ingesta esos mensajes se descartan enteros a propósito (son chats personales
  del profesional) y el aviso no puede ser la puerta de atrás por donde entran.
- **Nunca sacar el aviso por el bus "porque ya está la notificación"**: el bus es
  el que hace que la pantalla abierta se entere sin recargar.
- **Nunca volver a derivar un aviso de un contador** (mensajes sin leer, alertas
  pendientes) si se espera poder marcarlo como visto: lo que sostiene el ítem es
  el contador, así que resolverlo lo borra del feed en vez de dejarlo marcado.
- **Nunca emitir un aviso por mensaje sin agrupar**: en un canal de chat eso es
  una línea por mensaje, y una ráfaga tapa el resto de la campana.
