# Agenda del consultorio

Qué días y a qué horas se pueden dar turnos, y por qué esa regla vive donde
vive.

## El problema que resuelve

Configuración → Turnos siempre dejó elegir **días de atención** y **horario de
atención**. Hasta esta iteración, ninguno de los dos hacía nada:

- el selector de hora del alta de turno **sí** usaba `atencionHoraDesde/Hasta`
  para armar la lista de franjas, pero solo apagaba las horas que ya habían
  pasado;
- `diasAtencion` no lo leía **nadie**: se podía guardar "atiendo lunes a
  viernes" y seguir agendando un domingo;
- nada miraba si la franja ya estaba **ocupada** por otro turno. El choque se
  descubría al apretar "Agendar", cuando el dominio devolvía
  `ErrorTurnoConflicto`.

El resultado práctico era una configuración decorativa y un formulario que
ofrecía horarios que iba a rechazar.

## Dónde está la regla

En el **dominio**, en un solo lugar, y la pantalla la anticipa.

```
ConfiguracionConsultorio.atiendeEl(fecha)        ← ¿se atiende ese día?
ConfiguracionConsultorio.admiteHorario(hora, min) ← ¿entra completo en el horario?
        ↑
dominio/servicios/agendaConsultorio.ts
  verificarDentroDeLaAgenda(configuracion, { fecha, hora, duracionMinutos })
        ↑                        ↑
   AgendarTurno          ReprogramarTurno
        ↑                        ↑
        └── src/lib/agenda.ts (franjasDelDia) → FormularioTurno / FormularioReprogramar
```

`src/lib/agenda.ts` **no** es la regla: es su anticipo en pantalla. Apaga de
antemano las opciones que el servidor iba a rechazar. El servidor las rechaza
igual: el router tRPC es un entry point propio y una validación de UI no lo
cubre.

**Los dos casos de uso comparten la función a propósito.** Mientras la regla
estuvo solo en el alta, reprogramar era la puerta de atrás para dejar un turno
un domingo. Duplicarla en los dos deja que uno se olvide al cambiarla.

## Las tres reglas

### 1. Día de atención

`diasAtencion` es un array de `0..6` (0 = domingo). Se lee **en UTC**
(`fecha.getUTCDay()`), no en el huso del navegador ni del servidor: `Turno.fecha`
es un `DATE` de Postgres y llega como medianoche UTC. Con `getDay()`, en
cualquier zona al oeste de Greenwich —la nuestra— un turno del lunes se leería
como domingo y quedaría rechazado.

**La lista vacía significa "sin restricción", no "no atiende nunca."** Un
consultorio que todavía no configuró su agenda tiene que poder agendar, y
vaciar el campo no puede ser la forma de bloquearse a sí mismo.

### 2. Horario de atención

Se mira el **fin** del turno, no solo el inicio: una consulta de 30 minutos que
arranca a la hora de cierre no es un turno válido, es media hora después de
cerrar. Por eso `admiteHorario` recibe la duración.

Consecuencia visible: con atención hasta las 20:00 y consultas de 30 minutos,
la última franja ofrecida es **19:30**, no 20:00 como antes. Y si el profesional
cambia la duración a 60 minutos, la lista se recorta sola.

Sin horario configurado (ambos `null`) no hay restricción.

### 3. Franja ocupada

Solo en la pantalla, porque el dominio ya la tenía: `AgendarTurno` compara con
`Turno.seSolapaCon` y lanza `ErrorTurnoConflicto`. Lo que faltaba era mostrarlo
antes. `franjasDelDia` pide los turnos del día elegido y apaga las franjas que
pisan uno existente, con la misma regla que el dominio:

- los turnos **CANCELADOS no ocupan** (cancelar libera el horario);
- al reprogramar, el turno propio se excluye (`excluirTurnoId`): moverlo quince
  minutos no puede chocar consigo mismo.

## Lo que ve el profesional

En el desplegable de hora cada franja apagada dice por qué:

| Motivo    | Etiqueta           | Qué pasó                               |
| --------- | ------------------ | -------------------------------------- |
| `ocupado` | «ocupado»          | ya hay un turno ahí                    |
| `pasado`  | «ya pasó»          | la hora se fue (solo aplica si es hoy) |
| `cierra`  | «fuera de horario» | la consulta no termina antes de cerrar |

Además:

- el formulario **abre en el próximo día de atención**
  (`proximoDiaDeAtencion`), no en un día cerrado donde nada se puede agendar;
- si el profesional elige a mano un día cerrado, aparece un aviso con la lista
  de días que sí atiende y el botón de agendar se apaga;
- si cambia el día o la duración y la hora elegida deja de estar disponible, se
  reubica sola en la primera libre. Sin eso el formulario se enviaría con una
  hora que el servidor va a rechazar.

## Errores

`ErrorTurnoFueraDeAtencion` (código `VALIDACION`) es distinto de
`ErrorTurnoConflicto` (código `CONFLICTO`) a propósito: no choca con otro turno,
contradice la configuración del propio consultorio. El mensaje dice cuál de las
dos reglas se rompió y dónde se cambia.

## Al tocar esto

- Una regla nueva de agenda va en `agendaConsultorio.ts` y en
  `ConfiguracionConsultorio`, **no** en un caso de uso: si entra en uno solo,
  el otro camino queda abierto.
- El espejo de pantalla vive en `src/lib/agenda.ts` y tiene sus propios tests
  (`src/lib/agenda.test.ts`). Si cambia la regla del dominio, hay que cambiar
  las dos —son dos capas, no una duplicación por descuido— y los tests de
  `agenda.test.ts` están escritos para que la diferencia se note.
- Todo lo que compare días de la semana usa **UTC**. Ya se explicó arriba por
  qué; es el error que este módulo tiene más a mano.
