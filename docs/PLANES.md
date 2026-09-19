# Planes nutricionales

Un plan se asigna a un paciente vía `AsignacionPlan`. Antes se llamaba "Dieta";
se renombró en la Fase 3 y hay redirects permanentes en `next.config.ts`.

Este documento cubre lo que se sumó después: **las dos modalidades de plan**,
**el material adjunto** y **la asignación desde la ficha del paciente**.

Un paciente puede tener **varios planes asignados a la vez** y ninguno reemplaza
a otro. Ver «Varios planes por paciente: el presente y el pasado, aparte».

## Dos modalidades, no dos variantes

|                           | `APP`                    | `PDF`                        |
| ------------------------- | ------------------------ | ---------------------------- |
| Qué es el plan            | las franjas cargadas acá | los archivos subidos         |
| Comidas                   | al menos una             | ninguna (no se admiten)      |
| Documentos del plan       | ninguno (prohibido)      | al menos uno, y pueden ser varios |
| Anexos                    | sí                       | sí                           |
| PDF generado con membrete | sí                       | no aplica                    |
| Sirve de plantilla        | sí                       | no                           |

**Son dos maneras de trabajar, no dos formas de llenar el mismo plan.** Quien
arma sus planes en Word o Canva los tiene terminados y solo quiere que el
paciente los vea; quien los carga en la app quiere las franjas, las opciones
intercambiables y el PDF con membrete que sale de ellas.

### Por qué está declarado y no deducido

La primera versión (migración 36) puso el PDF como un adjunto opcional del plan:
si estaba, la vista lo mostraba primero. Eso mezcló las dos cosas y trajo dos
problemas que son el mismo error:

- el anexo de un plan cargado —la lista de compras— se mostraba **como si fuera
  el plan**, tapándolo;
- solo se podía adjuntar **uno**, porque el campo era 1 a 1.

"¿Tiene un PDF?" no alcanza para saber qué es ese PDF. Por eso ahora son dos
preguntas separadas (migración 37):

- **`modalidad`** dice de qué clase es el plan;
- **`archivos.esDocumentoDelPlan`** dice cuáles de sus archivos SON el plan, y
  solo tiene sentido en modalidad PDF.

La segunda pregunta vivió hasta la migración 66 en `archivoPrincipalId`, una
columna del plan, y por eso el plan subido era exactamente UN archivo. Ver
«El plan puede ser varios documentos», más abajo.

La entidad lo hace cumplir en las dos direcciones: un plan PDF con comidas
cargadas se rechaza (habría dos planes en el mismo registro y ninguna forma de
decir cuál rige) y un plan APP con archivo principal también (ahí ningún anexo
puede hacer de plan).

**La modalidad no se cambia editando.** Pasar de PDF a APP dejaría un plan sin
comidas; al revés tiraría las que ya se cargaron. Se elige al dar de alta, con
dos botones distintos en `/dashboard/planes`.

## Cómo se guardan los archivos

Los archivos del plan son **`Archivo`**, dueños del arco exclusivo igual que las
fotos de una receta:

```
archivos.planId              → planes_nutricionales.id  (1 a N, CASCADE)
archivos.esDocumentoDelPlan  → ¿este archivo ES el plan, o lo acompaña?
```

No es una columna con una ruta porque un plan no "tiene un path": tiene un
Archivo, con su clave en el bucket, su MIME, su tamaño y su borrado compensado,
que es lo que el módulo Archivos ya resuelve.

El contexto de subida es `plan` (`CONTEXTOS_ARCHIVO`), prefijo `planes/`,
**PDF o Word** (`.doc`/`.docx`), 25 MB. El punto es que el paciente lo LEA
adentro de la app sin descargar nada ni tener Office instalado: el PDF lo
dibuja el navegador tal cual, y el Word se convierte a HTML en el servidor
(`/api/archivos/[id]/html`) — `VisorArchivo` decide a qué ruta ir según el
MIME (`esDocumentoWord`, en `dominio/entidades/Archivo.ts`).

**Se suben antes de que el plan exista** y se vinculan al guardarlo, igual que
los adjuntos de una receta. Por eso el CHECK `archivos_un_solo_dueno` es `<= 1` y
no `= 1` (ver migración 34).

`IPlanRepositorio.crear/actualizar` reciben `archivoIds`: es el **estado final**,
lo que no está en la lista se desvincula. Los documentos viajan en esa lista
aunque vengan además en `documentoIds` — ser el plan no exime a un archivo de
estar vinculado a él.

**Un archivo que sale de la lista se BORRA, no se desvincula**
(`PrismaRepositorioPlan.vincularArchivos`). Un archivo sin dueño no lo recoge
nadie: el barrido semanal del worker limpia objetos del bucket **sin fila**, no
filas sin dueño. Borrada la fila, el objeto queda huérfano de verdad y ese
barrido sí se lo lleva.

La marca de documento se pone **después** de vincular —un archivo recién subido
todavía no es del plan— y se limpia primero en todos los del plan: la lista que
llega es el estado final, así que un documento que pasó a anexo tiene que perder
la marca.

## El plan puede ser varios documentos

El plan armado afuera no siempre es un archivo: la pauta viene en un PDF, las
equivalencias en otro, el instructivo en un tercero, y los tres SON el plan.
Con `archivoPrincipalId` —una columna, un archivo— dos de los tres caían abajo
en «Material adjunto», leídos como apoyo de sí mismos: la misma confusión que
la migración 37 había venido a arreglar, entrando por otra puerta.

La migración 66 mueve la respuesta a la fila del archivo
(`archivos.esDocumentoDelPlan`), porque la pregunta «¿esto es el plan o lo
acompaña?» es de **cada archivo** y no del plan. La entidad expone los dos
grupos ya separados —`documentos` y `adjuntos`— y el DTO de salida los pasa así,
sin la lista cruda: si cada pantalla decidiera por su cuenta, dos vistas del
mismo plan podrían mostrar cosas distintas. Es exactamente el error que ya se
cometió con la foto de la receta (migración 35).

**Se fue el fallback**, y no por descuido: `archivoPrincipal` caía en el primer
archivo disponible cuando el elegido ya no estaba, porque la FK era SET NULL y
el plan podía quedar apuntando a nada teniendo anexos. Con la marca en la fila
ese estado no existe: borrar un documento lo saca de la lista y ningún anexo
asciende a plan solo. Los planes que venían con el principal borrado los
resuelve la migración, marcando el primero —la elección que el fallback venía
haciendo—.

El `INCLUIR_HIJOS` del repositorio sigue trayendo los archivos con `orderBy`:
ese orden es el que el paciente ve, un documento abajo del otro.

## Recetas vinculadas directamente al plan

En modalidad APP, una receta se vincula a una OPCIÓN de una franja
(`OpcionComida.recetaId`): "el Desayuno puede ser esto, o esta otra receta".
Un plan PDF/Word no tiene franjas —el plan es el archivo—, así que no hay de
dónde colgar esa relación. `RecetaDelPlan` (migración 56) es el vínculo
directo plan↔receta, sin pasar por una franja ni un horario: recetas que
acompañan al plan en general, no a una comida puntual.

Es una tabla de vínculo pura —sin ella no queda nada que decir— y las dos FKs
son CASCADE, igual que `AsignacionReceta`: borrar el plan o la receta se lleva
el vínculo, no al otro lado.

No se restringe por modalidad: un plan de la app puede sumarlas también, como
agregado a las que ya tenga por opción (`FormularioPlan` solo las muestra en
la rama PDF/Word, pero el dominio no las prohíbe en la otra). En la vista del
plan salen en una tarjeta propia, debajo del visor o de las franjas, como el
material adjunto: acompañan al plan, no lo reemplazan.

Cada una **lleva a la receta**: a `/dashboard/recetas/[id]` desde la ficha del
plan y desde la pestaña "Plan actual" del paciente, y a `/mis-recetas/[id]`
desde «Mi plan». Antes era el nombre en texto plano de este lado y un diálogo
del otro, así que para ver la receta de un plan había que ir al recetario a
buscarla a mano. `onVerReceta` sigue siendo opcional —sin él la receta es solo
texto— y quien la pasa decide a dónde lleva.

`SincronizarRecetasDePlan` las suma a las de las opciones al calcular qué
recetas le llegan a quien sigue el plan hoy: es el único camino para que un
plan PDF comparta recetas con el paciente en absoluto.

## Cómo lo ve el paciente

`GET /api/archivos/[id]/ver` — sirve el archivo **en línea y desde la app**.

Es el hermano de `/api/archivos/[id]`, que redirige a una URL firmada del
bucket. Los dos existen porque hacen cosas distintas: aquel es para **bajar** un
adjunto, este para **mostrarlo adentro**. Un iframe apuntado a la URL firmada
carga otro origen y queda a merced de las cabeceras del bucket y de lo que el
navegador —o el WebView de Android— acepte embeber.

La autorización de las dos rutas es **idéntica, a propósito**: son dos formas de
leer el mismo archivo, y si una fuera más permisiva sería la puerta de atrás de
la otra.

La regla del paciente (`PuedeVerArchivoPaciente`) alcanza a **todos** los
archivos del plan **ACTIVO** —los documentos y los anexos—, y solo a ese: el plan
vigente es la indicación vigente, y dejar abierto el de un plan finalizado es
dejar al paciente siguiendo un plan que ya se cambió.

`VisorPdf` trae un botón "Abrir en una pestaña" que no es decorativo: es la
salida cuando el navegador no puede dibujar PDFs embebidos —pasa en el WebView
de Android, que no trae visor— y ahí el sistema lo abre con la app que
corresponda.

En `VistaPlan` el orden es siempre el mismo: **el plan primero** (un visor por
documento si es PDF, las franjas si es APP) y el **material adjunto al final**.
Un anexo nunca va arriba: eso es lo que llevó a separar las dos modalidades.

## El PDF generado y el PDF subido son dos cosas

`GET /api/planes/[id]/pdf` **genera** un PDF con el membrete del consultorio a
partir del plan cargado. No tiene nada que ver con los archivos subidos.

Por eso el botón "PDF" solo aparece en modalidad APP: generar el plan cargado de
un plan que ya ES un PDF da un documento vacío.

## Un plan en PDF no sirve de plantilla

`clonar()` lo rechaza con un mensaje explícito. Cada archivo pertenece a UN plan
y compartirlo haría que borrar el original le vaciara el clon; copiar el objeto
del bucket sería otra función. Se dice ahí y no se deja fallar más abajo como "un
plan en PDF necesita el archivo", que no explicaría nada.

Un plan APP clonado tampoco se lleva sus anexos, por lo mismo — pero ahí no es
un impedimento: el plan sigue completo.

## El nombre del plan es único

Por consultorio, y con **planes y plantillas como espacios separados**
(migración 38). Una plantilla «Descenso» y el plan «Descenso» que sale de ella
es el flujo esperado, no un choque.

El nombre es lo único que se ve al elegir un plan para asignar: dos planes
llamados igual son indistinguibles ahí, y asignar el equivocado no se descubre
hasta que el paciente pregunta.

La garantía dura es el índice único; el caso de uso consulta antes solo para
dar un mensaje entendible en vez de un error de Prisma. La consulta usa
`mode: "insensitive"` —«Descenso» y «descenso» son el mismo plan para quien
mira la lista—, así que es **más estricta** que el índice.

**Los archivados cuentan.** Siguen apareciendo en el historial y en el listado
con el filtro puesto, así que dos con el mismo nombre seguirían siendo ambiguos.
Para reusar un nombre hay que renombrar el viejo: una decisión explícita, no un
accidente.

**Clonar una plantilla NUMERA el nombre** («Descenso (2)», «(3)»…). Clonar es un
clic sin formulario: si fallara por nombre repetido, el botón quedaría
inservible a partir del segundo uso de la misma plantilla. Un nombre escrito a
mano, en cambio, no se toca: si choca, se avisa.

## Carpetas

`GrupoPlan` agrupa planes por **propósito**, que es como el profesional los
busca: por paciente («Julia Pérez»), por objetivo («Descenso»), por población
(«Deportistas»).

Es una carpeta libre y no una categoría cerrada porque el criterio lo pone quien
trabaja, y las dos formas responden a la misma necesidad: que la lista de planes
deje de ser una sola bolsa cuando pasa de veinte.

**La mayoría SÍ apunta a un paciente** (`GrupoPlan.pacienteId`, migración 56),
pero no por elección del sistema: es la carpeta que arma automáticamente
"crear plan desde la ficha del paciente" (ver más abajo), y queda atada a él
para poder reencontrarla la próxima vez sin adivinar por nombre —dos pacientes
homónimos, o uno que cambia de apellido, la habrían dejado huérfana—. Una
carpeta armada a mano ("Descenso", "Deportistas") simplemente no la tiene:
sigue siendo libre, por objetivo, por población o por lo que el profesional
decida.

**Borrar la carpeta no borra los planes**: la FK es SET NULL y quedan sueltos.
Una carpeta es cómo están ordenados, no de quién son; llevarse el contenido al
tirar el rótulo sería una pérdida de datos disfrazada de organización. Lo
mismo si se borra el PACIENTE dueño de una carpeta automática: la FK
`pacienteId` también es SET NULL, la carpeta y sus planes quedan, solo deja de
estar atada a nadie.

### Crear un plan desde la ficha del paciente

`CrearPlanParaPaciente` es la manera corta de dar de alta un plan que nace
YA asignado: arma o carga la carpeta del paciente, crea el plan ahí adentro
(en cualquiera de las dos modalidades — cargado en la app o subiendo el
PDF/Word) y lo asigna en el mismo paso. No es "crear" + "mover" + "asignar" a
mano en la pantalla: son tres pasos con dos puntos donde un fallo a mitad de
camino dejaría un plan sin asignar, o asignado pero suelto de la carpeta.

La carpeta se busca por `GrupoPlan.pacienteId` y, si no existe, se crea con el
nombre completo del paciente. Si ese nombre ya está tomado —una carpeta
manual, u homónimos— se numera igual que el nombre de un plan clonado
(«Julia Pérez (2)»): es un flujo sin campo de texto para el nombre de la
carpeta, así que no hay dónde escribir uno distinto si choca.

Los planes que se le creen DESPUÉS a ese mismo paciente por esta vía caen en
la MISMA carpeta: se reencuentra por `pacienteId`, no por nombre de texto.

### Se navegan como directorios

La pantalla de planes es un explorador, no un desplegable de filtro:

- **en la raíz** se ven las carpetas y, debajo, los planes **sueltos**;
- **al entrar** a una carpeta, la ruta muestra dónde estás y la lista pasa a
  mostrar solo lo de adentro;
- **crear un plan estando adentro lo guarda ahí** (`grupoIdInicial`), sin el
  paso de "crearlo y después moverlo";
- cada plan tiene un botón **Mover** que abre solo el selector de carpeta.

**Las carpetas son de los PLANES: las plantillas no viven en carpetas.** No hay
navegador de carpetas en la pestaña de plantillas, la lista las muestra todas,
el formulario no ofrece el campo Carpeta cuando se está creando una plantilla y
la acción Mover no aparece. Una plantilla es un molde del que se saca un plan;
guardarla dentro de la carpeta de un paciente la vuelve imposible de encontrar
desde cualquier otro, que es lo contrario de para qué existe. Las carpetas
ordenan el trabajo con UN paciente; las plantillas son transversales a todos.

Es deliberado que se parezca a un explorador de archivos: «guardar el plan de
Julia en la carpeta de Julia» es una idea espacial. Un desplegable no da la
sensación de haber entrado a ningún lado, y peor, **nada indica que la carpeta
existe hasta que lo desplegás**.

Que la raíz liste los **sueltos** y no todo también es a propósito: si mostrara
todo, los planes de las carpetas aparecerían dos veces —arriba en su carpeta y
abajo en la lista— y entrar a una carpeta no cambiaría nada.

**No hay carpetas dentro de carpetas.** Un nivel alcanza para el volumen de un
consultorio, y el anidamiento traería mover carpetas, romper ciclos y migas de
pan para un problema que nadie tiene todavía.

Los conteos de cada carpeta van **separados por tipo** (`cantidadPlanes` /
`cantidadPlantillas`) porque la pantalla navega planes y plantillas por
separado: una carpeta con 3 planes y ninguna plantilla tiene que verse vacía en
la pestaña de plantillas, no decir «3» y abrirse sin nada.

**Mover es su propio caso de uso** (`MoverPlanAGrupo`), no un `ActualizarPlan`
con un campo distinto: ordenar no es editar. Pasar un plan de carpeta por el
editor completo obligaría a reenviar comidas, archivos y recomendaciones
enteras para cambiar un campo, y cualquier fallo a mitad de camino reescribiría
el plan.

En el repositorio, `null` filtra los sueltos y `undefined` no filtra: son dos
preguntas distintas y colapsarlas haría imposible pedir la raíz.

## Varios planes por paciente: el presente y el pasado, aparte

`AsignacionPlan` nació siendo **dos cosas a la vez**: «qué plan tiene hoy» y
«qué planes tuvo». Por eso llevaba un período (`fechaInicio`/`fechaFin`), un fin
real (`finalizadaEn`), un estado (`activa`) y una foto del nombre del plan
(`nombrePlan`) para sobrevivirle al borrado. Encima de eso, un índice único
parcial —una activa por paciente— convertía asignar en **reemplazar**.

La migración 69 separa las dos preguntas, porque el consultorio no trabaja así:
el paciente sigue la pauta general y, al mismo tiempo, el plan de suplementación
y el de la semana de competencia. Ninguno rige sobre los otros y no empiezan ni
terminan en una fecha declarada.

**La mezcla era el problema, no el historial.** Las dos preguntas no valen lo
mismo: «qué tiene hoy» se consulta todo el tiempo y tiene que ser barato; «qué
tuvo» no se muestra en ninguna pantalla, pero es información clínica del
paciente y **no se puede reconstruir después**. Así que cada una tiene su tabla.

La asignación pasa a ser lo mismo que ya eran `AsignacionReceta` y
`AsignacionMaterial`: **un vínculo puro**.

```prisma
model AsignacionPlan {
  id              String   @id
  nutricionistaId String
  planId          String
  pacienteId      String
  creadoEn        DateTime @default(now())

  @@unique([planId, pacienteId])
}
```

Lo que se fue de la asignación, y a dónde:

| Se fue                     | A dónde                                                       |
| -------------------------- | ------------------------------------------------------------- |
| `fechaInicio` / `fechaFin` | se fueron: un plan no empieza ni termina en una fecha declarada |
| `activa`                   | se fue: todas lo están, porque desasignar BORRA la fila         |
| `finalizadaEn`             | es `DesasignacionPlan.desasignadoEn`                            |
| `nombrePlan`               | es `DesasignacionPlan.nombrePlan`, la misma foto                |

Y por eso mismo **`planId` vuelve a ser NOT NULL con CASCADE**: borrar el plan
se lleva sus vínculos, como con una receta. El historial NO se va con él —tiene
su propia FK, con SET NULL— y ahí `nombrePlan` sigue existiendo, del lado que sí
lo necesita.

### El pasado: `DesasignacionPlan`

Una fila por cada vez que un plan dejó de estar asignado a un paciente:

```prisma
model DesasignacionPlan {
  id, nutricionistaId, pacienteId
  planId        String?    // SET NULL: el plan se puede borrar después
  nombrePlan    String     // foto al desasignar
  asignadoEn    DateTime
  desasignadoEn DateTime
}
```

Tres decisiones que la sostienen:

- **Es append-only y ninguna pantalla la lee.** Por eso el puerto no tiene
  método para consultarla: no es un read model, es un registro. El front solo
  asocia, desasocia y muestra lo asignado hoy —y el paciente, lo mismo—.
- **Se escribe en UN solo lugar**, dentro de la misma transacción que borra el
  vínculo (`PrismaRepositorioPlan.desasignarDePaciente`). Son la misma operación
  vista de los dos lados: si el borrado anduviera sin el registro, el paciente
  perdería el plan y nadie podría decir que alguna vez lo tuvo. Si algún día
  aparece otro camino para sacarle un plan a alguien, tiene que pasar por ahí o
  el registro queda con huecos.
- **`nombrePlan` se copia al desasignar**, no se resuelve después por `planId`:
  el plan se puede renombrar o borrar, y la fila tiene que seguir diciendo qué
  tenía el paciente **entonces**. Es exactamente la foto que llevaba la vieja
  `asignaciones_plan`.

`asignadoEn` sale del `creadoEn` del vínculo que se cierra. No estaba en el
pedido original, pero sin él la fila dice qué dejó de tener y no desde cuándo lo
tuvo, que es la mitad de la pregunta.

**El historial viejo se muda, no se pierde**: la migración pasa las asignaciones
cerradas a la tabla nueva conservando el id, y `desasignadoEn` sale del fin REAL
(`finalizadaEn`), cayendo al planificado y al `creadoEn` para las filas
anteriores a la migración 38 que no lo tienen.

**Ojo con la trampa que esto tiende.** Un registro que nadie lee es un registro
que nadie nota cuando se rompe — le pasó al historial anterior, que tuvo dos
agujeros hasta la migración 38 justo porque no se miraba. Si algún día se
muestra en pantalla, lo primero es verificar que no tenga huecos; no asumir que
está completo porque la tabla existe.

**Asignar es idempotente.** La garantía dura es `UNIQUE (planId, pacienteId)` y
el repositorio hace `upsert`: asignar dos veces el mismo plan al mismo paciente
deja una sola fila y no falla. El formulario igual lo avisa antes —el botón se
deshabilita— para no dejar un clic que no hace nada.

**Desasignar nombra el plan.** `DesasignarPlanDePaciente` recibe `planId` y
`pacienteId`, no solo el paciente: "sacarle el plan" dejó de significar algo
cuando puede tener cinco.

### Lo que arrastró el cambio

- **Se fue la alerta PLAN_VENCIDO**, entera: era "asignación activa cuya
  `fechaFin` ya pasó" y sin fechas nada vence. La migración borra las alertas de
  ese tipo y saca el valor del enum `TipoAlertaSeguimiento`; dejar las
  pendientes sería pedir renovar algo que ya no caduca.
- **El archivo del plan se ve si el plan está asignado HOY**
  (`PuedeVerArchivoPaciente` → `estaAsignado`), sin importar cuántos otros
  tenga. Sigue siendo solo lo asignado: dejarle abierto el de un plan que le
  sacaron es dejarlo siguiendo un plan que ya no es suyo.
- **El tracking une las franjas de TODOS los planes asignados**, sin repetir.
  "Desayuno" en dos planes es una franja que registrar, no dos: contarla doble
  le bajaría la cobertura por tener más planes.
- **Las metas del plan semanal** salen del PRIMER plan asignado que declare
  macros, y su nombre viaja en `nombrePlanDeLasMetas` para que la pantalla diga
  de dónde salieron. Ninguno rige sobre los otros, así que elegir en silencio
  sería inventar una jerarquía.
- **`EliminarPlan` sigue avisando** si el plan está asignado a alguien, y ahora
  importa el doble. No es redundante con el CASCADE: la base se llevaría los
  vínculos en silencio, varios pacientes se quedarían sin un plan que estaban
  siguiendo y —peor— sin pasar por `desasignarDePaciente` **no quedaría registro
  de que lo tuvieron**. Es el único camino por el que un vínculo puede morir sin
  dejar rastro, y por eso está tapado en el caso de uso.

## Quiénes tienen un plan

`/dashboard/planes/[id]` lista quiénes lo tienen asignado y deja desasignar
desde ahí. Es la contracara de asignar desde la ficha del plan: se decide sobre
el plan, y obligar a entrar a cada paciente para soltarlo era el mismo viaje de
ida y vuelta que ya se había sacado en la asignación. Desasignar ahí le saca a
ese paciente SOLO este plan.

## Asignar el plan desde la ficha del paciente

`FormularioAsignacionPlan` acepta los dos extremos como opcionales porque se
entra desde las dos puntas:

| Desde              | Viene fijado | Se elige en el formulario |
| ------------------ | ------------ | ------------------------- |
| Ficha del plan     | `planId`     | el paciente               |
| Ficha del paciente | `pacienteId` | el plan                   |

**El lado fijado no se muestra.** Cambiarlo ahí sería asignar algo distinto de lo
que dice la pantalla.

El selector de planes lista solo `esPlantilla: false` e
`incluirArchivados: false`: una plantilla no se asigna (se clona) y un plan
archivado ya se dio de baja.

En la pestaña "Plan nutricional" de la ficha, las acciones de arriba son del
PACIENTE y siempre suman uno más —**Crear plan nuevo**, **Subir plan** y
**Asignar plan existente**—, y cada plan de la lista trae las suyas: **PDF** (si
es de la app) y **Desasignar**, que actúa sobre ESE plan. No hay "Cambiar plan":
cambiar es asignar el nuevo y, si corresponde, sacar el viejo — dos decisiones,
no una.

**Desde la ficha del PLAN se puede elegir más de un paciente.** El botón
"Asignar a paciente" de `/dashboard/planes` abre el mismo `FormularioAsignacionPlan`,
pero con el paciente sin fijar (`planId` fijo, sin `pacienteIdFijo`) pasa a un
selector MÚLTIPLE: es una tanda ("asignarle este plan a estos cinco"), y forzar
una asignación por vez ahí sería el mismo viaje de ida y vuelta que ya se sacó
del resto del módulo. Cada asignación es independiente en el servidor
(`AsignarPlanAVariosPacientes` reusa `AsignarPlanAPaciente` paciente por
paciente): uno que falle —no existe, es una plantilla— no aborta a los demás, y
el mensaje final cuenta cuántos anduvieron y cuántos no.

Ese mismo diálogo muestra, debajo del formulario, la lista de **quiénes ya
tienen asignado este plan** (`PacientesDelPlan`, la misma que
`/dashboard/planes/[id]`): es lo primero que se quiere saber antes de sumar
más pacientes, y pedirlo aparte hubiera sido otra ida y vuelta.

Desde la ficha del PACIENTE, en cambio, el destino es él y nadie más: no hay
selector múltiple ahí.

## Cómo los ve el paciente

«Mi plan» cambia según cuántos tenga:

- **uno**: el plan entero, directo. Es el caso común, y una tarjeta que hay que
  tocar para ver lo único que hay sería un paso de más.
- **varios**: las mismas tarjetas que la ficha del profesional
  (`TarjetaPlanAsignado`), y cada una lleva a **`/mi-plan/[id]`**. Dibujarlos
  todos enteros dejaba el segundo a varias pantallas de scroll en el teléfono.

En la ficha del profesional el plan se abre EN EL LUGAR; en el portal, en su
propia página. No es una inconsistencia: el portal se usa desde el teléfono y la
app de Android, y ahí el «atrás» del sistema tiene que volver a la lista. Con el
plan abierto en un estado de la pantalla, «atrás» sacaría al paciente de «Mi
plan». Por eso la tarjeta acepta `href` u `onAbrir`, uno de los dos.

`/mi-plan/[id]` NO consulta por id: se queda con el plan que aparezca en
`misPlanes`. Esa lista ya es la autorización —un id ajeno, o uno desasignado con
la pantalla abierta, simplemente no está— y es el mismo criterio que
`/mis-recetas/[id]`. Las dos pantallas dibujan el plan con `MiPlanCompleto`
(contenido + «Descargar PDF» si es de la app), para que el mismo plan no se vea
distinto según por dónde se llegó.

La tarjeta "Tu plan ahora" del inicio, en cambio, junta las franjas de todos en
una sola bolsa —qué toca comer ahora no depende de en cuál de sus planes esté
escrito— y manda a «Mi plan» para verlos separados.

## Al tocar esto

- Los archivos entran al modelo como `Archivo`, no como columnas. Si hace falta
  otro dueño, se suma al mismo arco y se actualiza el CHECK
  `archivos_un_solo_dueno` (sigue siendo `<= 1`).
- `PlanNutricional.archivos` lo completa el **repositorio** al leer: al crear el
  plan solo se conocen los ids, porque subir y guardar son dos pasos. Es el mismo
  patrón que `recetaNombre` en una opción.
- El DTO de salida expone `documentos` y `adjuntos` **ya separados**. No
  agregues la lista cruda "por si acaso": es la puerta para que una pantalla
  vuelva a decidir por su cuenta cuál de los archivos es el plan.
- Editar un plan **reemplaza** sus archivos: el formulario manda los que quiere
  que queden. Igual que manda las comidas que no tocó.
- Al sumar un filtro al listado, **acordate de `ObtenerPlanesPaginado`**: arma
  el filtro campo por campo para no arrastrar la paginación al conteo, así que
  un filtro que solo esté en el DTO y en el repositorio no hace nada. Le pasó a
  `grupoId`, y el síntoma fue "el filtro de carpetas no anda", sin ningún error.
- Al agregar un campo al plan, **acordate del `create` del repositorio**, no solo
  del `update`. La modalidad se perdió exactamente así: la escribía `actualizar`
  pero no `crear`, y todos los planes en PDF nacían como planes de la app con el
  archivo colgado de anexo. El síntoma no fue un error sino un default correcto
  ganándole a un valor que nunca se mandó.
- `IPlanRepositorio.crear`/`actualizar` reciben `recetaIds` como tercer
  parámetro, con el mismo contrato que `archivoIds`: es el estado final, y lo
  que no está en la lista se DESVINCULA (no se borra — una receta tiene dueño
  propio, a diferencia de un archivo del plan).
- `CrearPlanParaPaciente` y `AsignarPlanAVariosPacientes` reusan `CrearPlan` y
  `AsignarPlanAPaciente` en vez de reimplementar la asignación: si cambia lo que
  hay que validar antes de asignar, cambia en un solo lugar y los dos flujos lo
  heredan.
- La asignación es un vínculo, no una entidad con vida propia. Si mañana hace
  falta una fecha o una nota ahí, preguntate primero si no es del PLAN o del
  PASADO (`DesasignacionPlan`): meterle estado a `AsignacionPlan` es lo que
  llevó a que asignar reemplazara, y se arregló una vez ya.
- **Todo camino nuevo que le saque un plan a un paciente tiene que pasar por
  `desasignarDePaciente`.** Es el único lugar que escribe el registro, y un
  `deleteMany` sobre `asignaciones_plan` desde otro lado lo dejaría con huecos
  sin que nada falle: nadie lee esa tabla, así que nadie se entera.
