# Asistente analítico del profesional

El chat del nutricionista sobre su propia práctica: pacientes, planes, recetas
y turnos. Responde con **herramientas** que leen la base, nunca de memoria.

## Las tres cosas que lo tenían roto

Convivían y se disfrazaban entre sí; conviene tenerlas separadas.

### 1. No sabía qué día era

Un modelo no conoce la fecha. Preguntarle «¿qué turnos tengo hoy?» era
imposible de responder aunque la herramienta devolviera los turnos con su
fecha: no tenía contra qué compararlas. Ahora el system prompt lleva la fecha
de hoy y el formato en que vienen las de las herramientas.

### 2. Los turnos de hoy se filtraban solos

`Turno.fecha` es un DATE que llega como **medianoche UTC**. El filtro comparaba
contra la medianoche **local**:

```
turno de hoy  = 2026-09-01T00:00:00Z
inicio local  = 2026-09-01T03:00:00Z   (Argentina, UTC-3)
```

El turno de hoy quedaba «antes de hoy» y se descartaba. Es la misma trampa que
`getDay()` vs `getUTCDay()` que ya documenta AGENTS.md. Ahora usa
`IRelojFecha.hoy()`, que devuelve medianoche UTC.

### 3. No recordaba nada

`OpcionesConversacion` tenía un único `pregunta: string`: cada mensaje viajaba
solo al modelo. Un «¿y de ese paciente qué más?» no tenía a qué referirse.
Ahora el puerto recibe `mensajes: TurnoConversacion[]` con la conversación
entera.

## Las conversaciones se guardan

`ConversacionIA` + `MensajeIA` (migración 44), del **consultorio** y no de un
paciente: una consulta analítica puede cruzar varios. El historial por paciente
del portal sigue siendo `ConsultaIA`.

Guardar los turnos cumple dos funciones a la vez, y por eso es una sola tabla y
no dos mecanismos: son **el registro** que el profesional relee y **el
contexto** que se le manda al modelo en la pregunta siguiente.

- La pregunta se guarda **antes** de llamar al modelo y la respuesta después:
  si el modelo falla, lo que el profesional escribió no se pierde.
- Se mandan los **últimos 12 turnos**, no la conversación entera: viaja completa
  en cada pregunta y se paga por token cada vez.
- El título sale de la primera pregunta, cortado en un espacio.

## Qué ve el asistente de un plan

`datos_de_paciente` y `detalle_de_plan` devuelven las **opciones de cada
franja**, que es el contenido real del plan. Antes iba solo el nombre de la
franja («Desayuno», «Almuerzo»), así que el asistente no podía decir qué come
un paciente por más que se lo preguntaran. `listar_planes` es a propósito un
índice: manda metas y cantidad de comidas, y el detalle se pide por id, porque
las franjas de 200 planes no entran en el contexto.

## Los errores ya no se disfrazan de respuesta

`AsistenteAnaliticoClaude` degrada al stub **solo si no hay IA configurada**. Si
la hay y la llamada falla, el error se propaga. Antes cualquier excepción se
tragaba con un `catch` vacío y se devolvía el texto de demostración: un 401 o un
timeout llegaban a la pantalla como si fueran una respuesta, y el profesional no
tenía cómo saber que la IA no había contestado nada.

## El modelo configurado es el techo

Encadenar herramientas (ubicar al paciente, traer su plan, mirar la agenda) y
sostener una conversación con contexto es lo primero que se degrada con un
modelo chico. El código puede estar bien y las respuestas seguir siendo pobres.
Antes de buscar el bug, mirar qué modelo hay en Configuración → Integraciones.
