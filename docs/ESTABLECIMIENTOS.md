# Establecimientos

Un nutricionista atiende en más de un lugar. Qué se asocia a cada lugar, qué
no, y por qué.

## La decisión de fondo: el lugar es del turno, no del paciente

Un paciente va a los dos consultorios. Si el establecimiento fuera un campo del
paciente, habría que elegir por él de cuál "es", y esa elección sería falsa el
día que viniera al otro. Peor: al cambiarla, todos sus turnos pasados se
mudarían de sede.

Un turno, en cambio, es un evento en tiempo **y lugar**. Ocurrió donde ocurrió y
eso no cambia nunca. Por eso:

| Dato                                | Dónde vive                          | Qué significa                       |
| ----------------------------------- | ----------------------------------- | ----------------------------------- |
| `Turno.establecimientoId`           | obligatorio, FK RESTRICT            | dónde se atiende esta consulta      |
| `Paciente.establecimientoHabitualId`| opcional, FK SET NULL               | dónde SUELE atenderse (preferencia) |

`establecimientoHabitual` **no restringe nada**: precarga el formulario de turno
y ordena el listado. La diferencia entre "suele venir acá" y "pertenece acá" es
lo que esta feature no puede perder, y por eso el campo es SET NULL: si la sede
se archiva, se pierde la preferencia y no pasa nada.

## Lo que NO cambia: el no solapamiento

`turnos_sin_solapamiento` (migración 27) agrupa por `nutricionistaId` **y nada
más**, y `Turno.seSolapaCon` ignora el establecimiento a propósito.

El error fácil acá es agregarle `establecimientoId` a la clave del EXCLUDE
pensando que dos sedes son dos agendas. No lo son: el profesional es uno solo y
no puede estar en dos lugares a las 10:00. Dos turnos a la misma hora en
consultorios distintos no son dos turnos posibles, son uno imposible.

**El eje del solapamiento es quién atiende, no dónde.** El día que haya varios
profesionales por sede, la clave pasa a ser el profesional — nunca el lugar.

Queda pendiente, como regla aparte: el **tiempo de traslado**. Un turno en el
centro a las 10:00 y otro en el barrio a las 10:30 no se solapan pero tampoco se
pueden cumplir. Es una validación de dominio, no una restricción de base.

## La agenda es del lugar

`diasAtencion`, `atencionHoraDesde/Hasta`, `turnoDuracionMinutos` y
`turnoPasoMinutos` describen al LUGAR: el caso típico es "lunes y miércoles en
el centro, martes y jueves en el barrio". Por eso viven en `Establecimiento`.

Lo que se queda en `ConfiguracionConsultorio` describe al PROFESIONAL, que es
uno solo: membrete, matrícula, apariencia del PDF, prefijo telefónico,
plantillas de email.

La semántica de los campos no cambió (ver `docs/AGENDA.md`): la lista de días
vacía significa "sin restricción", el horario nulo tampoco restringe, y el día
de la semana se lee en **UTC** porque `Turno.fecha` es un DATE de Postgres.

La mudanza se hizo en dos pasos: la migración 48 copió los valores al
establecimiento principal y la 49 borró las columnas viejas, una vez que
`agendaConsultorio.ts` y `lib/agenda.ts` pasaron a leer el establecimiento. La
pantalla siguió el mismo camino: **Configuración → Turnos** se convirtió en
**Configuración → Establecimientos**, y en Configuración quedó solo el
membrete.

## Cómo se resuelve "dónde estoy atendiendo"

`AgendarTurno` recibe `establecimientoId` **opcional** y lo resuelve así:

1. si la pantalla mandó uno, se valida que exista y no esté archivado;
2. si no, la sede **principal** (`esPrincipal`, única por inquilino con un
   índice parcial);
3. si no hay principal —se archivó y no marcaron otra—, la primera vigente;
4. si no hay ninguna, error.

La regla vive en el caso de uso y no en la pantalla a propósito: si cada
formulario eligiera su propio default, el alta desde el calendario y el alta
desde la ficha del paciente terminarían en sedes distintas.

### Qué agenda usa cada pantalla

| Pantalla           | Sede cuya agenda rige           | Por qué                                                    |
| ------------------ | ------------------------------- | ---------------------------------------------------------- |
| Alta de turno      | la **elegida en el formulario** | cambiar de sede cambia días, horario y paso en el acto      |
| Reprogramar        | la **del turno**                | si se agendó en el barrio, moverlo respeta los días de ahí  |
| Calendario, 1 sede | esa sede                        | es la agenda de ese lugar                                   |
| Calendario, todas  | la **unión** de todas           | ver `agendaUnificada` más abajo                             |

El alta arranca en la primera de estas que exista:

1. **la sede del hueco clickeado** — el día ya la determinó;
2. **la sede habitual del paciente**, en cuanto se lo elige (ver abajo);
3. **la que el profesional está gestionando**;
4. **la principal** — el mismo fallback que aplicaría el servidor si el
   formulario no dijera nada.

Elegir la sede a mano congela la decisión: cambiar de paciente después ya no la
mueve.

## El calendario unificado

La opción **«Todos los consultorios»** del selector no es un caso borde: es la
vista por defecto. El profesional es uno solo y no puede estar en dos lugares a
la vez, así que su semana real es **una sola agenda** por más sedes que tenga.
Filtrar por una es para concentrarse en un lugar, no para separar agendas.

Con varias sedes a la vista:

- **Los turnos se pintan todos juntos.** El relleno del globo sigue diciendo el
  estado (pendiente / confirmado / completado); el **filo izquierdo** lleva el
  color del establecimiento, y al costado aparece la leyenda. Si los dos
  colores compitieran por el mismo píxel se perdería uno de los dos datos.
- **La ventana horaria es la unión**, no la intersección: de la sede que abre
  más temprano a la que cierra más tarde. Recortarla escondería turnos, que es
  la peor forma de perder uno.
- **Un sábado que atiende una sola sede no se pinta cerrado.** Los días también
  se unen. Y una sede sin restricción (lista vacía) deja la unión sin
  restricción, que es lo que significa para ella sola.
- **Las franjas libres dejan de ser clickeables**, salvo en un caso: ver
  «Agendar desde el calendario unificado» abajo. Un hueco significa "acá se
  puede agendar", y en general eso depende de en cuál de las sedes se pregunte:
  ofrecerlo sería ofrecer un turno que la otra rechaza.

El color de cada sede es el que eligió, o uno de una paleta asignado **por
posición** en la lista: así no cambia entre recargas, que es lo único que hace
que el color sirva para reconocer un lugar.

### Agendar desde el calendario unificado

Hay una configuración en la que el hueco **sí** dice en qué consultorio se
agenda, y ahí vuelve a ser clickeable. La resuelve `sedePorDiaDeLaSemana`, que
exige las tres condiciones a la vez:

1. **Mismo horario de atención** en todas las sedes. Si difirieran, un hueco de
   las 19:00 sería válido en una y tarde en otra.
2. **Misma duración de turno.** Es la que decide el alto del bloque y si el
   turno entra antes de cerrar.
3. **Días disjuntos**: ninguna sede comparte día con otra.

La tercera es la que hace el trabajo. Si el centro atiende lunes y miércoles y
el barrio martes y jueves, entonces **"martes" ya dice "barrio"** y no queda
nada que preguntar: el click resuelve la sede por el día y el formulario se
abre con ella puesta. Una sede sin días declarados (lista vacía = "todos los
días") rompe la condición 3 por definición: se pisa con todas.

El **paso puede diferir** y no importa: como cada día pertenece a una sola
sede, las franjas de ese día se calculan con la agenda de ESA sede —su paso, su
duración—, no con la unión. El hueco que se ofrece es exactamente el que esa
sede acepta.

Cuando la configuración no cumple las tres, el texto de ayuda del calendario lo
dice y el alta sigue estando en el botón, que pregunta dónde.

### Dónde vive la elección

En `localStorage`, vía `ProveedorSedeActiva`, montado en el layout del
dashboard. Es del navegador, no del usuario ni de la base: es una preferencia de
vista. Vive en el layout y no en la pantalla de turnos porque el alta también se
abre desde la ficha del paciente y tiene que arrancar en la misma sede.

**El selector de sede es un filtro de vista, no de aislamiento.**
El límite multi-inquilino es `nutricionistaId` y sigue siendo el único: los
pacientes, planes, recetas y evoluciones son del consultorio entero. Meter el
establecimiento como segundo eje en la extensión de Prisma escondería la ficha
de un paciente por haber cambiado de sede en el header.

## Gestión de sedes

`Configuración → Establecimientos` lista las vigentes y las archivadas, y desde
ahí se crea, se edita la agenda, se archiva, se restaura y se elige la
principal. Tres reglas que vale la pena conocer:

- **La primera sede queda principal sola.** Sin ninguna marcada, un turno que no
  elige sede no tendría dónde caer.
- **No se puede archivar la última vigente.** Un consultorio sin sedes activas
  no puede agendar nada, y el bloqueo se descubriría recién al intentar dar el
  próximo turno. El botón se apaga y el servidor lo rechaza igual.
- **Al archivar la principal, el rol pasa a otra vigente.** Agendar caería igual
  en la primera, pero dejarlo explícito evita que el default dependa del orden
  de una consulta.

## Baja lógica

`archivadoEn`, como en `Paciente`. Una sede que cerró sigue siendo el lugar
donde ocurrieron los turnos de los últimos años y la FK desde `turnos` es
RESTRICT: borrarla rompería el histórico.

Al archivarse deja de ser la principal automáticamente (el fallback no puede
apuntar a un lugar que ya no se ofrece). El nombre es único **entre las
vigentes**: con un índice total, una sede archivada bloquearía su nombre para
siempre.

## La sede habitual del paciente

`Paciente.establecimientoHabitualId`, opcional y con FK SET NULL. Se elige en
el formulario del paciente («Sin preferencia» es una respuesta válida y
frecuente: quien va indistintamente a las dos no tiene una).

Su ÚNICO efecto es precargar el formulario de turno al elegir al paciente. No
filtra listados, no restringe dónde se le puede dar un turno, y si la sede se
archiva se pierde sin consecuencias. Convertirla en una pertenencia es
exactamente lo que esta feature decidió no hacer.

## Lo que la sede alimenta

| Dónde                    | Qué usa                          | Detalle                                                        |
| ------------------------ | -------------------------------- | -------------------------------------------------------------- |
| Recordatorios (WhatsApp) | `{{establecimiento}}`, `{{direccion}}` | variables opcionales; las plantillas viejas siguen andando |
| Recordatorios (email)    | las mismas                       | misma función `variablesRecordatorio`                          |
| Google Calendar          | `location` del evento            | «Nombre — Dirección»; con sede archivada, la de ese turno       |
| Estadísticas             | corte por sede                   | turnos, completados, cobrado y pendiente                        |
| Excel de turnos          | columna «Establecimiento»        | con el filtro que la pantalla tenga puesto                      |

Dos criterios que se repiten y conviene sostener:

- **La sede se pide por id, no del listado vigente.** Un turno viejo puede ser
  de una sede archivada, y esa sigue siendo la dirección correcta para ese
  turno.
- **Cuando hay lote, una sola consulta.** Los envíos masivo y programado traen
  todas las sedes a un `Map` antes del bucle: pedirla por turno serían N
  consultas para un dato que cambia una vez al año.
- **Nunca queda el placeholder crudo.** Sin sede resuelta o sin dirección
  cargada, `{{direccion}}` se reemplaza por vacío: mandarle «{{direccion}}» al
  paciente es peor que no decirle la dirección.

## Al tocar esto

- **No toques el EXCLUDE.** Ver arriba; es el error que este módulo tiene más a
  mano.
- Una sede nueva nace sin restricción de agenda (`diasAtencion: []`, horario
  nulo): primero existe, después se configura.
- El alta de un inquilino crea su sede principal en dos lugares que tienen que
  seguir de acuerdo: `ProvisionadorNutricionista` (cuentas nuevas) y el backfill
  de la migración 48 (las que ya existían). El seed hace lo propio.
- El filtro por sede se aplica **en la consulta**, no en memoria:
  `listarTurnosDto.establecimientoId` viaja hasta el `where` de Prisma, y el
  Excel exporta con el mismo filtro que la pantalla tiene puesto.
- Los recordatorios, el evento de Google y las estadísticas ya leen la sede:
  ver «Lo que la sede alimenta» abajo.
- La sede habitual del paciente **precarga, nunca restringe**. Si alguna vez
  hay que filtrar por ella, no es este campo: es una preferencia, y el paciente
  puede recibir turnos en cualquier lado.
