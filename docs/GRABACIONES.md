# Grabaciones de consulta

El profesional graba el audio de la consulta desde la ficha del turno. Al
terminar, el audio se transcribe y una IA arma **un resumen de la consulta**
para la ficha del paciente.

Tres modelos y un trabajo en segundo plano:

| Pieza                | Qué es                                    | Dónde vive                                   |
| -------------------- | ----------------------------------------- | -------------------------------------------- |
| `GrabacionConsulta`  | un tramo de audio + su transcripción      | `dominio/entidades/GrabacionConsulta.ts`      |
| `ResumenConsulta`    | el resumen del turno entero               | `dominio/entidades/ResumenConsulta.ts`        |
| `Archivo`            | el audio en el bucket (contexto `grabacion`) | `dominio/entidades/Archivo.ts`             |
| cola `transcribir-grabacion` | el trabajo del worker             | `trabajos/manejadores/transcribirGrabaciones.ts` |

Del lado del navegador son tres piezas más, y el reparto entre ellas es el
tema de la sección siguiente:

| Pieza                         | Qué es                                       | Dónde vive                                          |
| ----------------------------- | -------------------------------------------- | --------------------------------------------------- |
| `ProveedorGrabacionConsulta`  | dueño del micrófono y del turno que se graba | `componentes/turnos/ProveedorGrabacionConsulta.tsx`  |
| `GrabacionesConsulta`         | el panel: grabar, resumen y transcripciones  | `componentes/turnos/GrabacionesConsulta.tsx`         |
| `PildoraGrabacion`            | la grabación minimizada                      | `componentes/turnos/PildoraGrabacion.tsx`            |

## Muchas grabaciones por turno, un resumen por turno

Son las dos decisiones que explican el resto del diseño.

**Muchas grabaciones.** Una consulta se interrumpe —entra alguien, suena el
teléfono, se corta para pesar— y obligar a una sola grabación significaba
perder lo grabado o dejar el micrófono abierto en el medio. `orden` las
devuelve en la secuencia en que ocurrieron, que es la que le da sentido a la
transcripción concatenada. El grabador además **pausa de verdad**
(`MediaRecorder.pause()`), así que la interrupción corta no obliga a cerrar el
tramo.

**Un resumen.** Lo que se resume es la CONSULTA; las grabaciones son los pedazos
en que quedó partida. Un resumen por pedazo obligaría al profesional a leer tres
textos y reconstruir la consulta él.

`ResumenConsulta.grabacionesIncluidas` es cuántas transcripciones había cuando
se generó. Es lo que deja decir «este resumen quedó viejo» sin comparar textos:
si después aparece otra, la pantalla lo marca desactualizado y ofrece
regenerarlo, en vez de mostrar en silencio un resumen al que le falta la mitad
de la consulta. Se compara contra las transcripciones **listas**: una que
todavía se está transcribiendo no lo vuelve viejo, lo va a volver cuando
termine.

## Se graba en segundo plano, y por eso el grabador no es del diálogo

Grabar dura toda la consulta, y durante la consulta el profesional USA la app:
abre la ficha, mira la antropometría anterior, carga una evolución, agenda el
turno que sigue. Mientras el `useGrabadorAudio` vivió dentro del diálogo del
turno, cerrarlo desmontaba el componente y con él el `MediaRecorder`: había que
elegir entre grabar o usar el sistema, y lo que se hacía era no grabar.

El grabador vive entonces en `ProveedorGrabacionConsulta`, montado en
`app/dashboard/layout.tsx`. **El layout es lo único que no se vuelve a montar
al navegar entre pantallas del panel**, y de eso —y solo de eso— depende que el
micrófono siga abierto. Bajarlo a una pantalla, o devolver el `useGrabadorAudio`
al diálogo, reintroduce el problema exacto sin romper ninguna compilación; por
eso `ProveedorGrabacionConsulta.test.tsx` comprueba que cerrar el panel no
llama a `detener` ni a `descartar`.

El reparto queda así:

- el **proveedor** es dueño del `MediaRecorder`, del turno que se está grabando
  y del guardado (subir el audio + `grabaciones.registrar`);
- el **panel** es una vista de eso, que se abre y se cierra sin consecuencias;
- la **píldora** es lo que queda cuando el panel se cierra grabando.

**Cerrar es minimizar.** La X, Escape y el clic afuera hacen lo mismo que el
botón «Minimizar», que existe igual porque es el que lo DICE: sin él, cerrar el
diálogo grabando parece que corta, y la salida que se usa es «Descartar» —que
tira la consulta—.

**La píldora no es decoración.** Una grabación corriendo sin nada en pantalla se
descubre al día siguiente, de dos horas y con lo que se haya dicho después de
que el paciente se fue. Por eso muestra a quién se está grabando y el
cronómetro, y por eso ofrece cortar sin volver al turno: obligar a navegar hasta
la agenda para apretar «Terminar» es la fricción que hace que no se apriete. No
ofrece descartar: ahí se aprieta de paso, y es un botón de tirar la consulta a
la basura.

**Una grabación a la vez, atada a su turno.** `turnoGrabando` se fija al empezar
y no lo mueve abrir el panel de otro turno: el audio tiene que ir a la consulta
donde se grabó, y un grabador que siguiera al panel guardaría la consulta de
alguien en la ficha de otro. El panel de un segundo turno muestra el aviso y el
camino a la grabación en curso, no el botón de grabar.

Dos detalles que no se ven y que se rompen solos si se tocan:

- **El turno se marca como «grabando» DESPUÉS de que el micrófono abrió.**
  `comenzar` no lanza —deja el estado en ERROR con el motivo—, así que devuelve
  si lo logró. Marcarlo antes deja un turno en curso que nunca grabó nada, con
  su píldora fantasma encima.
- **El contexto está partido en dos.** El cronómetro cambia cuatro veces por
  segundo y el valor de un contexto repinta a todos sus consumidores: con uno
  solo, grabar repintaba la grilla de la agenda cada 250 ms. Las pantallas usan
  `useAbrirGrabacion` (un valor estable); el panel y la píldora, que sí tienen
  que seguir el reloj, usan `useGrabacionConsulta`.

Lo que sigue sin poder sobrevivir es **recargar o cerrar la pestaña**: lo grabado
está en memoria y todavía no hay nada subido. El proveedor pone un
`beforeunload` mientras se graba para que el navegador pregunte, que es todo lo
que se puede hacer sin cambiar el modelo de subida.

## El recorrido completo

```
navegador          MediaRecorder → Blob (Opus 32 kbps)
   │
   ├─ POST /api/archivos (multipart, contexto `grabacion`)   → Archivo huérfano
   │
   └─ trpc grabaciones.registrar  → GrabacionConsulta + vínculo del audio
                                  → encola `transcribir-grabacion`
worker
   ├─ resuelve el inquilino de la fila EN ALCANCE GLOBAL
   ├─ ejecutarEnNutricionista(...)
   ├─ descarga el audio del bucket → ITranscriptorAudio
   ├─ guarda la transcripción (estado LISTA)
   └─ GenerarResumenConsulta(turnoId, { soloSiFalta: true })
```

El audio se sube ANTES de que exista la fila —no hay id de grabación hasta
guardarla—, igual que las fotos de una receta. Por eso el CHECK
`archivos_un_solo_dueno` sigue siendo `<= 1` y no `= 1` (migración 34).

**El inquilino no viaja en el trabajo.** El payload lleva solo `grabacionId`; el
worker lee `nutricionistaId` de la fila en alcance global y recién ahí fija el
alcance. Mandarlo en el payload sería una segunda copia del vínculo, y una que
nadie valida contra la fila.

**La transcripción no corre en la request.** Un audio de una hora tarda minutos
en un proveedor remoto: hacerlo en línea dejaría al profesional mirando una
ruedita al final de la consulta, o cerrando la pestaña y perdiendo el trabajo.
El **resumen** sí corre en la request cuando se pide a mano: resumir un texto ya
transcrito son segundos y quien apretó el botón está esperando.

## Reintentos: dos políticas que no se pisan

`TranscribirGrabacion` **no lanza** cuando falla el proveedor: anota el motivo en
la grabación y lo devuelve. Si lanzara, pg-boss reintentaría con su propia
política en paralelo a la que lleva la entidad (`intentos`), y el profesional no
vería nunca por qué su grabación no se transcribió — solo una fila clavada en
«pendiente».

- **Fallo del proveedor** (429, clave vencida, audio que no acepta) → lo maneja
  la entidad: hasta `MAX_INTENTOS_TRANSCRIPCION` (3) vuelve a PENDIENTE, después
  queda FALLIDA con el motivo a la vista. El intento se cuenta **al empezar**,
  no al fallar: si el proceso muere en el medio, la grabación no vuelve a la
  cola para siempre.
- **Fallo del proceso** (worker muerto, base caída) → lo maneja pg-boss, con dos
  reintentos y backoff.

El **barrido de rescate** (cada 10 minutos) levanta lo que quedó PENDIENTE o
TRANSCRIBIENDO en cualquier consultorio. Cubre el encolado que falló —la app
guardó la fila pero no pudo hablar con pg-boss— y el worker que murió a mitad de
un audio. Sin él, esas grabaciones esperaban para siempre.

El **reintento a mano** reinicia el contador a cero, a propósito: el pedido viene
DESPUÉS de haber arreglado la causa (cargar la clave, subir el saldo), así que
arrancar con los intentos agotados haría fallar el primer reintento.

## Proveedores

Transcribir y resumir son **dos capacidades distintas con dos proveedores
distintos**, y esa es la razón de que la pantalla de Integraciones tenga dos
tarjetas:

| Capacidad   | Puerto                | Proveedores          | Se configura en             |
| ----------- | --------------------- | -------------------- | --------------------------- |
| voz a texto | `ITranscriptorAudio`  | OpenAI, OpenRouter   | tarjeta «Voz a texto»       |
| resumen     | `IResumidorConsulta`  | el LLM de la app     | tarjeta «IA (Claude)»       |

**Anthropic no transcribe audio.** Atar las dos cosas a `proveedorIA` habría
dejado la grabación sin funcionar justo para quien tiene la IA con Claude, que
es el caso normal.

La clave de transcripción se guarda bajo la clave `TRANSCRIPCION_API_KEY` y no
bajo `API_KEY`: el proveedor puede ser el mismo que el de la IA (OpenRouter) y
la unicidad es `(inquilino, proveedor, clave)`, así que con el mismo nombre
cargar una pisaría la otra sin aviso.

**OpenRouter no tiene endpoint de transcripción.** El audio entra como un bloque
`input_audio` de un mensaje de chat contra un modelo que escuche. Dos límites que
la pantalla avisa: no acepta WebM —que es lo que graba Chrome— y un modelo de
chat puede resumir de más en consultas largas. Existe igual porque quien ya paga
OpenRouter no tiene por qué abrir otra cuenta para probar la función.

### Los stubs LANZAN

Es la diferencia con el resto de los stubs de IA de la app, y es deliberada. Un
chat de demostración se lee como una demostración; una transcripción falsa
guardada en la ficha de un paciente es un registro clínico inventado, y el
resumen que salga de ella lo va a parecer todavía más. Sin proveedor
configurado, la grabación queda FALLIDA con el motivo, **el audio queda
guardado**, y cargar la clave más tarde permite reintentar sin perder nada.

## El tope de 25 MB no es una precaución

Es el límite de subida de la API de transcripción de OpenAI, y está replicado en
el contexto `grabacion` de `CONTEXTOS_ARCHIVO`. Se rechaza **al subir** y no en
el worker: ahí el profesional ya se fue de la consulta y el error no lo ve
nadie.

Con Opus a 32 kbps mono —que es lo que el grabador le pide a `MediaRecorder`—
son unos 100 minutos. Una consulta más larga se parte en varias grabaciones, que
es algo que la función ya hace. Sin fijar la tasa, Chrome elige una bastante más
alta y una consulta larga no entra.

## Por qué puede no abrir el micrófono

Dos condiciones del navegador que no dependen del permiso de la persona, y que
se ven iguales si no se las separa: «no diste acceso».

**La `Permissions-Policy` de la página gana sobre el permiso del usuario.** La
app la emite en `next.config.ts` y durante un tiempo decía `microphone=()`, que
apaga el micrófono para todo el sitio: `getUserMedia` rechazaba con
`NotAllowedError` aunque el permiso estuviera concedido, y conceder el permiso
de nuevo no cambiaba nada. Va `microphone=(self)` —solo este origen, no lo que
se embeba dentro—. La cámara sigue apagada: no se graba video.

**Sin contexto seguro no existe `navigator.mediaDevices`.** El navegador solo lo
expone en HTTPS o en `localhost`. Entrando por la IP de la red (`192.168.…`) o
por un túnel sin TLS, la propiedad es `undefined` y el acceso lanza un
`TypeError` — que no es un problema de permisos y no se arregla dando permiso.
`useGrabadorAudio` lo comprueba ANTES de tocarla, para no reportarlo mal.

Por eso el hook distingue `MotivoSinGrabador` (contexto inseguro, permiso
denegado, sin micrófono, micrófono ocupado por otro programa, no soportado) y
cada mensaje nombra la acción que lo resuelve. Y el estado de error **no es
terminal**: hay botón de reintentar, porque conceder el permiso y volver a
probar es la secuencia normal y recargar la página en el medio de una consulta
no lo hace nadie.

## Formatos y firma binaria

`MediaRecorder` devuelve el MIME con el códec pegado
(`audio/webm;codecs=opus`) y la lista blanca del servidor compara el string
completo: el cliente lo recorta hasta el `;` antes de subir. Chrome y Firefox
graban WebM, Safari MP4.

Los cuatro formatos de audio tienen firma en `firmaArchivo.ts` (EBML, `ftyp`,
`OggS`, ID3 / sync MPEG), como el resto de lo que la app acepta: el MIME lo
declara quien sube, los primeros bytes no mienten.

## Privacidad

Las grabaciones, sus transcripciones y el resumen son **material clínico del
profesional**: no hay procedimiento de paciente en el router, igual que la
historia clínica y los laboratorios. Lo que el paciente ve de su evaluación está
enumerado en `AGENTS.md` y esto no está ahí.

El audio se sirve **desde la app** (`/api/archivos/<id>/ver`), nunca por una URL
firmada: en producción el bucket vive en la red interna de Docker y no existe
para el navegador. La transcripción completa viaja a la pantalla y se muestra
plegada, pero presente: es la fuente del resumen, y un resumen generado por un
modelo sobre un audio transcrito por otro tiene que poder contrastarse.
Esconderla convertiría al resumen en la única versión de lo que pasó.

**Avisar que se graba es responsabilidad del profesional.** La pantalla lo
recuerda al lado del botón; la app no puede hacerlo por él.

## Al tocar esto

- Un proveedor de transcripción nuevo es un adaptador de `ITranscriptorAudio`
  más una rama en `ResolvedorTranscripcion`, y **no** toca ni los casos de uso ni
  la UI.
- Cambiar el prompt del resumen se hace en `ResumidorConsultaLLM` y en ningún
  otro lado: el resumen automático y el botón «regenerar» pasan los dos por
  `GenerarResumenConsulta`, justamente para que no existan dos prompts.
- Borrar una grabación **no** regenera el resumen. Es material ya generado y
  revisado, y reescribirlo solo porque se borró un audio le cambiaría el
  contenido al profesional sin que lo haya pedido: la pantalla lo marca
  desactualizado y él decide.
- El estado de la grabación describe SOLO la transcripción. Si el resumen falla,
  la transcripción sigue LISTA: el texto ya está guardado y es lo que de verdad
  importa conservar.
- El guardado (subir + registrar) es del PROVEEDOR y no del panel, y avisa sus
  errores con un toast en vez de dejar propagar la promesa: minimizado, quien
  grabó puede estar en otra pantalla, y un fallo en silencio le hace creer que
  la consulta quedó guardada.
